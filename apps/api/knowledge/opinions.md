# Opinions

Source: my interview answers (2026-11-14). Only views I have stated myself, each with the
experience behind it. Nothing here is a general opinion about the field.

- A successful build is not a successful run. On Mizan the CI was green for three pull requests
  while the container crashed on start, because the CI built the image and never ran it. Now
  the CI runs what it builds.
- "Working" and "working under the real constraints" are different things. Mizan screened 10
  CVs in 220 seconds on a free LLM tier when my target was 60. I got it to about 90 and wrote
  down that the target was not met.
- An honest record of what was not achieved is better than a flattering number.
- Do not trust the documented shape of the data. On the voice agent the real phone call did not
  match the documentation; I confirm from a real log and write the test from it.
- If an action costs money and its result is unknown, it goes to a human. Retrying is how one
  "yes" from a caller becomes two orders.
- An AI score needs evidence a person can check. That is why Mizan shows the quoted CV line
  before the score, and discards any quote it cannot find in the CV.
- AI tools should support a decision, not make it. Mizan never rejects a candidate on its own.
