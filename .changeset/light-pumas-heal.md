---
'@sveltejs/kit': patch
---

For json response, updated the condition to check whether the body is an instance of ReadableStream to resolve endpoint response breaking issue with application/json
