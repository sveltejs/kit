---
'@sveltejs/kit': patch
---

refactor `import.meta.env` usage in `$app/stores.js` to use `$app/env.js` to DRY code and make mocking easier
