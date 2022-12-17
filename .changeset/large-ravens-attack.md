---
"@sveltejs/adapter-node": patch
---

Update dependency @rollup/plugin-json to v6

Note: plugin-json v6 fails your build for parse errors that only logged a warning with v5. We consider this a bugfix as only healthy input should result in a successful build.
