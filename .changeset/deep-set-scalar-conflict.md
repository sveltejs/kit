---
'@sveltejs/kit': patch
---

fix: report a `form_field_array_conflict` instead of throwing a raw `TypeError` when a remote form field path descends through a scalar or non-plain-object value