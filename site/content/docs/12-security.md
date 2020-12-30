---
title: Security
---

By default, SvelteKit does not add security headers to your app, but you may add them yourself using middleware such as [Helmet][].

### Content Security Policy (CSP)

[SvelteKit does not yet support CSP.](https://github.com/sveltejs/kit/issues/93)

Sapper supported CSP by generating inline `<script>`s and `<style>`s, which can fail to execute if [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) headers do not allow javascript or stylesheets sourced from inline resources.

To work around this, Sapper can inject a [nonce](https://www.troyhunt.com/locking-down-your-website-scripts-with-csp-hashes-nonces-and-report-uri/) which can be configured with middleware to emit the proper CSP headers. The nonce will be applied to the inline `<script>`s and `<style>`s. Here is an example using [Express][] and [Helmet][]:

```js
// server.js
import uuidv4 from 'uuid/v4';
import helmet from 'helmet';

app.use((req, res, next) => {
	res.locals.nonce = uuidv4();
	next();
});
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			scriptSrc: [
				"'self'",
				(req, res) => `'nonce-${res.locals.nonce}'`
			]
		}
	}
}));
app.use(sapper.middleware());
```

Using `res.locals.nonce` in this way follows the convention set by
[Helmet's CSP docs](https://helmetjs.github.io/docs/csp/#generating-nonces).

If a CSP nonce is set via `res.locals.nonce`, you can refer to that value via tag `%sapper.cspnonce%` in `src/template.html`. For instance:

```html
<script nonce="%sapper.cspnonce%" src="..."></script>
```

[Express]: https://expressjs.com/
[Helmet]: https://helmetjs.github.io/
