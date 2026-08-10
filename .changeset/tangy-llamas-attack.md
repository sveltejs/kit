---
'@sveltejs/adapter-netlify': patch
---

fix: import the generated manifest via `pathToFileURL`, which handles special characters in the project path
