---
'@sveltejs/kit': patch
---

fix: omit empty `<input type="file">` fields from submitted form data instead of including them as `undefined`
