---
"@sveltejs/kit": patch
---

fix: properly handle percent-encoded anchors (e.g. `<a href="#sparkles-%E2%9C%A8">`) during prerendering.
