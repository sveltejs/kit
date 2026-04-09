---
'@sveltejs/kit': patch
---

breaking: on the server, make the promise returned from `refresh` represent adding the refresh to the map, not the time it takes to run the remote function
