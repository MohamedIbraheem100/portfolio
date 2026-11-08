"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PointData } from "@/lib/pcp3";

/*
  The live hero (W5). Same look as tools/prototype (D26 mono palette, halftone
  sizing, jittered-grid points), rendered with three.js through R3F.

  Motion rule 1: on load, scattered points assemble into the portrait in 1.6 s
  (GSAP drives the uAssemble uniform). Motion rule 2: cursor parallax up to 8
  degrees, lerped. Everything is a uniform or an attribute: no per-frame JS
  over the points. three.js objects are created once in a lazy state initializer and
  disposed on unmount, which keeps the component pure for the React Compiler.
*/

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aDepth;
  attribute float aLuma;
  uniform float uAssemble;
  uniform float uRelief;
  uniform float uSize;
  uniform float uDpr;
  varying float vDepth;
  varying float vLuma;
  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }
  void main() {
    float stagger = fract(sin(dot(aStart.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.35;
    float t = easeOutCubic(clamp((uAssemble - stagger) / (1.0 - stagger), 0.0, 1.0));
    vec3 target = vec3(position.xy, (aDepth - 0.5) * uRelief);
    vec3 p = mix(aStart, target, t);
    vDepth = aDepth;
    vLuma = aLuma;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float lum = pow(aLuma, 0.7);
    gl_PointSize = uSize * uDpr * (2.2 / -mv.z) * (0.8 + 0.4 * aDepth) * (0.45 + 0.9 * lum);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying float vDepth;
  varying float vLuma;
  const vec3 RAISED = vec3(0.086, 0.114, 0.271);
  const vec3 PHOSPHOR = vec3(0.914, 0.925, 0.961);
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r2 = dot(q, q);
    if (r2 > 0.25) discard;
    float luma = min(pow(vLuma, 0.7), 0.92);
    float v = pow(luma, 0.85) * (0.55 + 0.45 * vDepth);
    vec3 col = mix(RAISED, PHOSPHOR, v);
    float alpha = 1.0 - smoothstep(0.12, 0.25, r2);
    gl_FragColor = vec4(col, alpha);
  }
`;

const FOV = 32;
const MAX_TILT = THREE.MathUtils.degToRad(8);

/** Deterministic scatter (mulberry32): the same cloud explodes the same way every visit. */
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

function buildScene(data: PointData, dpr: number) {
  const n = data.count;
  const pos = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const rnd = seeded(7);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = data.xy[i * 2];
    pos[i * 3 + 1] = data.xy[i * 2 + 1];
    pos[i * 3 + 2] = 0;
    const r = 1.6 + rnd() * 1.4;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    start[i * 3] = r * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.8;
    start[i * 3 + 2] = r * Math.cos(ph) * 0.6 - 0.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(data.depth, 1));
  geometry.setAttribute("aLuma", new THREE.BufferAttribute(data.luma, 1));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uAssemble: { value: 0 },
      uRelief: { value: 0.35 },
      uSize: { value: 3.0 },
      uDpr: { value: dpr },
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
  const target = useRef({ x: 0, y: 0 });
  // Built once per data set (lazy initializer); never rebuilt on re-render.
  const [{ geometry, material }] = useState(() =>
    buildScene(data, Math.min(window.devicePixelRatio || 1, 1.5)),
  );

  useEffect(() => {
    const t0 = performance.now();
    const tween = gsap.to(material.uniforms.uAssemble, {
      value: 1,
      duration: 1.6,
      ease: "power3.out",
      delay: 0.15,
      onComplete: () => onAssembled(Math.round(performance.now() - t0)),
    });
    return () => {
      tween.kill();
    };
  }, [material, onAssembled]);

  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
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

  useFrame(() => {
    const g = group.current;
    if (g && parallax) {
      g.rotation.y += (target.current.x * MAX_TILT - g.rotation.y) * 0.08;
      g.rotation.x += (target.current.y * MAX_TILT * 0.6 - g.rotation.x) * 0.08;
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
  // The canvas has the cloud's own aspect (the still's box), so the camera distance that
  // fits x in [-1, 1] with a little margin is a constant: visible width 2.1.
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
