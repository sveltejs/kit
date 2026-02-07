---
'@sveltejs/adapter-netlify': major
---

breaking: `platform.context` is now the [modern Netlify Functions
context](https://docs.netlify.com/build/functions/api/#netlify-specific-context-object)

Previously, this was the [AWS Lambda-style
context](https://github.com/netlify/primitives/blob/c1ae30f2745f0a73e26e83334695e205a04ab47d/packages/functions/prod/src/function/handler_context.ts).

If you were using this in your app (unlikely), you will need to update your code to read from new fields.
