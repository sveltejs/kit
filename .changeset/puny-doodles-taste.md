---
'@sveltejs/kit': patch
---

Endpoints pre-rendered at root (routes/+server.{js|ts}) generate index.{content-type extension}, i.e. index.json and warn user about pre-rendering non-HTML content at root.
