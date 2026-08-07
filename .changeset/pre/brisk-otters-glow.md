---
'@sveltejs/adapter-auto': patch
---

fix: convert resolved adapter path to a file URL before importing, so builds work on Windows
