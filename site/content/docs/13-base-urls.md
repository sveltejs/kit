---
title: Base URLs
---

Ordinarily, the root of your Sapper app is served at `/`. But in some cases, your app may need to be served from a different base path — for example, if Sapper only controls part of your domain, or if you have multiple Sapper apps living side-by-side.

This can be done like so:

```js
// app/server.js

express() // or Polka, or a similar framework
	.use(
		'/my-base-path', // <!-- add this line
		compression({ threshold: 0 }),
		serve('static'),
		sapper.middleware()
	)
	.listen(process.env.PORT);
```

Sapper will detect the base path and configure both the server-side and client-side routers accordingly.

If you're [exporting](docs#Exporting) your app, you will need to tell the exporter where to begin crawling:

```bash
sapper export --basepath my-base-path
```
