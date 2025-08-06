---
'@sveltejs/kit': patch
---

fix: support multiple cookies with the same name across different paths and domains

Fixes issue where setting multiple cookies with the same name but different paths would overwrite each other. Now cookies are stored with unique keys based on domain, path, and name, allowing proper handling of multiple cookies with identical names but different scopes.

The `cookies.get()` method now implements "most specific path wins" logic when multiple cookies with the same name exist, following standard browser behavior where more specific cookie paths take precedence.

```js
// Set cookies with same name but different paths
cookies.set('session', 'user_root', { path: '/' });
cookies.set('session', 'user_admin', { path: '/admin' });

// When on /admin path, get() returns the more specific cookie
cookies.get('session'); // returns 'user_admin' on /admin, 'user_root' on /
```

Backward compatibility is maintained - existing code continues to work as before.