---
'@sveltejs/kit': patch
---

fix: endpoints prerendered at the root path (`routes/+server.{js|ts}`) use the correct file extension in the filename based on the content-type header returned (i.e. index.json for application/json)
