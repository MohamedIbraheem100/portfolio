"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PointData } from "@/lib/pcp3";

/*
  The live hero (W5). D26 mono palette, halftone sizing, same point law as the
  offline still, rendered with three.js through R3F.

  The one orchestrated moment (motion rule 1): the portrait condenses out of a
  soft field of dust in 1.6 s (points fade in as they travel, the whole cloud
  settles from a slight tilt), then the detector sweep and the box (handled by
  the wrapper). After that, the only motion answers the visitor: cursor
  parallax up to 8 degrees. (A cursor-drift effect was tried and removed: it
  deformed the face.)
*/

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aDepth;
  attribute float aLuma;
  attribute float aSeed;
  uniform float uAssemble;
  uniform float uRelief;
  uniform float uBase;      // point diameter in device px for a mid-tone far point
  varying float vDepth;
  varying float vLuma;
  varying float vAlpha;
  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }
  void main() {
    float stagger = aSeed * 0.4;
    float t = easeOutCubic(clamp((uAssemble - stagger) / (1.0 - stagger), 0.0, 1.0));
    vec3 target = vec3(position.xy, (aDepth - 0.5) * uRelief);
    vec3 p = mix(aStart, target, t);
    vDepth = aDepth;
    vLuma = aLuma;
    vAlpha = smoothstep(0.0, 0.45, t);   // fade in while travelling
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float lum = min(pow(aLuma, 0.7), 0.92);
    gl_PointSize = uBase * (0.45 + 0.9 * lum) * (0.8 + 0.4 * aDepth) * (0.6 + 0.4 * t);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying float vDepth;
  varying float vLuma;
  varying float vAlpha;
  const vec3 RAISED = vec3(0.086, 0.114, 0.271);
  const vec3 PHOSPHOR = vec3(0.914, 0.925, 0.961);
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r2 = dot(q, q);
    if (r2 > 0.25) discard;
    float luma = min(pow(vLuma, 0.7), 0.92);
    float v = pow(luma, 0.85) * (0.55 + 0.45 * vDepth);
    vec3 col = mix(RAISED, PHOSPHOR, v);
    float edge = 1.0 - smoothstep(0.12, 0.25, r2);
    gl_FragColor = vec4(col, edge * vAlpha);
  }
`;

const FOV = 32;
const MAX_TILT = THREE.MathUtils.degToRad(8);

/** Deterministic PRNG (mulberry32): the same dust every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildScene(data: PointData) {
  const n = data.count;
  const pos = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const seedAttr = new Float32Array(n);
  const rnd = seeded(7);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = data.xy[i * 2];
    pos[i * 3 + 1] = data.xy[i * 2 + 1];
    pos[i * 3 + 2] = 0;
    // Dust field: a soft ellipsoid around the portrait, a little behind it.
    const r = Math.cbrt(rnd()) * 1.9;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    start[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.15;
    start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.75;
    start[i * 3 + 2] = r * Math.cos(ph) * 0.5 - 0.35;
    seedAttr[i] = rnd();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(data.depth, 1));
  geometry.setAttribute("aLuma", new THREE.BufferAttribute(data.luma, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seedAttr, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uAssemble: { value: 0 },
      uRelief: { value: 0.35 },
      uBase: { value: 2 },
    },
  });
  return { geometry, material };
}

type Props = {
  data: PointData;
  parallax: boolean;
  /** called once the first frame has been drawn */
  onFirstFrame: () => void;
  /** called when the assemble animation finishes, with the measured duration in ms */
  onAssembled: (ms: number) => void;
};

function Cloud({ data, parallax, onFirstFrame, onAssembled }: Props) {
  const group = useRef<THREE.Group>(null);
  const first = useRef(false);
  const tilt = useRef({ x: 0, y: 0 });
  const [{ geometry, material }] = useState(() => buildScene(data));
  // Per-frame uniform writes go through a ref: three.js objects are mutable by nature, and
  // the React Compiler only allows that outside render through refs.
  const uniforms = useRef<THREE.ShaderMaterial["uniforms"] | null>(null);
  useEffect(() => {
    uniforms.current = material.uniforms;
  }, [material]);

  // The moment: dust -> portrait, with the cloud settling from a slight tilt.
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.set(0.04, -0.12, 0);
    const t0 = performance.now();
    const tl = gsap
      .timeline({ delay: 0.1 })
      .to(material.uniforms.uAssemble, { value: 1, duration: 1.6, ease: "power3.out" }, 0)
      .to(g.rotation, { x: 0, y: 0, duration: 1.9, ease: "power3.out" }, 0)
      .call(() => onAssembled(Math.round(performance.now() - t0)), [], 1.7);
    return () => {
      tl.kill();
    };
  }, [material, onAssembled]);

  // Pointer: parallax target over the whole window (desktop only).
  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      tilt.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      tilt.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const u = uniforms.current;
    if (!u) return;
    // Point size proportional to the canvas, like the still: diameter = devicePx/1000 * 2.1.
    const base = ((state.size.width * state.viewport.dpr) / 1000) * 2.1;
    if (u.uBase.value !== base) u.uBase.value = base;

    const g = group.current;
    if (g && parallax) {
      g.rotation.y += (tilt.current.x * MAX_TILT - g.rotation.y) * 0.06;
      g.rotation.x += (tilt.current.y * MAX_TILT * 0.6 - g.rotation.x) * 0.06;
    }

    if (!first.current) {
      first.current = true;
      onFirstFrame();
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default function PointCloudPortrait(props: Props & { active: boolean }) {
  const { active, ...rest } = props;
  // The canvas has the cloud's own aspect, so the camera distance that fits x in [-1, 1]
  // with a small margin is a constant: visible width 2.1.
  const visibleHeight = 2.1 / rest.data.aspect;
  const z = visibleHeight / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, z] }}
      frameloop={active ? "always" : "never"}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <Cloud {...rest} />
    </Canvas>
  );
}
