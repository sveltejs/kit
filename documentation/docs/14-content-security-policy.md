---
title: Content Security Policy
---

At the moment, SvelteKit supports adding Content Security Policy via hooks. In environments with a runtime, HTTP headers can be added to the response object.

However, SvelteKit also requires some small pieces of inline JavaScript in order for hydration to work. To avoid using `'unsafe-inline'` (which, as the name suggests, should be avoided), SvelteKit can be configured to inject CSP nonces into the HTML it generates.

The nonce value is availiable to hooks as `request.locals.nonce`. A basic CSP handler hook might then look like this:

```javascript
export async function handle ({ request, resolve }) => {
  const directives = {
    'default-src': ["'self'", 'static.someotherdomain.com'],
    'script-src': ["'strict-dynamic'"],
    'style-src': ["'self'"]
  };
  const response = await resolve(request);

  const nonce = request.locals.nonce;

  directives['script-src'].push(`'nonce-${nonce}'`);
  directives['style-src'].push(`'nonce-${nonce}'`);

  if (process.env.NODE_ENV === 'development') {
    directives['style-src'].push('unsafe-inline')
  }

  const csp = Object.entries(directives)
    .map(([key, arr]) => key + ' ' + arr.join(' '))
    .join('; ');

  return {
    ...response,
    headers: {
      ...response.headers,
      'Content-Security-Policy': csp
    }
  };
};
```

Because of the way Vite performs hot reloads of stylesheets, `'unsafe-inline'` is required in dev mode.

Be warned: some other features of Svelte ([in particular CSS transitions and animations](https://github.com/sveltejs/svelte/issues/6662)) might run afoul of this Content Security Policy and require either rewriting to JS-based transitions or enabling `style-src: 'unsafe-inline'`.

The `'strict-dynamic'` directive is optional but supported by Kit. If not using it you must allow `'self'`.

The nonce placeholders can be toggled with the `kit.cspNonce` configuration option.
