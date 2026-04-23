---
'@sveltejs/kit': patch
---

fix: restore correct `RemoteFormFields` typing for nullable array fields (e.g. when a schema uses `.default([])`), so `.as('checkbox')` and friends work again
