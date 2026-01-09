---
'@sveltejs/kit': minor
---

breaking: remove `buttonProps` from experimental remote form functions; use e.g. `<button {...myForm.fields.action.as('submit', 'register')}>Register</button>` button instead
