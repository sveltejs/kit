---
title: Content Security Policy
---

At the moment, SvelteKit supports adding Content Security Policy via hooks. In environments with a runtime, HTTP headers can be added to the response object.

However, SvelteKit also requires some small pieces of inline JavaScript in order for hydration to work. To avoid using `'unsafe-inline'` (which, as the name suggests, should be avoided), SvelteKit can be configured to inject place-holders for CSP Nonces into the html it generates.

These placeholders take the form `%svelte.CSPNonce%`, and can be replaced with a nonce inside the hook. A basic CSP handler hook might then look like this:
```javascript
export async function handle ({ request, resolve }) => {
  const directives = {
    'default-src': ["'self'", rootDomain, `ws://${rootDomain}`],
    'script-src': ["'strict-dynamic'"],
    'style-src': ["'self'"]
  };

  const response = await resolve(request);

  const nonce = randomBytes(32).toString('base64');

  if (response.headers['content-type'] === 'text/html') {
    response.body = (response.body as string).replace(/%svelte.CSPNonce%/g, `nonce="${nonce}"`);
  }
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

Be warned: some other features of Svelte (in particular CSS transitions and animations) might run afoul of this Content Security Policy and require either rewriting to JS-based transitions or enabling `style-src: 'unsafe-inline'`.

The nonce placeholders can be toggled with the `kit.noncePlaceholders` configuration option.
