---
"@sveltejs/kit": patch
---

breaking: the `pending` property of a `form` object now contains the number of in-flight direct calls. The `submitting` property contains the number of in-flight form submissions, which is what `pending` previously referred to
