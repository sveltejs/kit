---
'@sveltejs/adapter-netlify': patch
---

fix: avoid unnecessary Netlify edge function invocations for static files, which resolves a conflict between Netlify Edge Functions and Netlify Identity
