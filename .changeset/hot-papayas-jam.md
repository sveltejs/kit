---
'@sveltejs/kit': patch
---

fix: respect HTML attributes `enctype` and `formenctype` for forms with `use:enhance`
fix: set default `Content-Type` header to `application/x-www-form-urlencoded` for `POST` form submissions with `use:enhance` to align with native form behaviour
