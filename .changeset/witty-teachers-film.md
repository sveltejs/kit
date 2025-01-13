---
'@sveltejs/adapter-netlify': patch
---

Fix: Avoid unnecessary Netlify edge function invocations for static files, which resolves a conflict between Netlify Edge Functions and Netlify Identity
