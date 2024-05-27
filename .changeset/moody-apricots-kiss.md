---
"@sveltejs/kit": patch
---

fix: respect `enctype`/`formenctype` HTML form attributes from form + set `application/x-www-form-urlencoded` as a default `Content-Type` for `POST` requests made by `enhance`
