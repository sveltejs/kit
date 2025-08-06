---
'@sveltejs/kit': patch
---

fix: support multiple cookies with the same name across different paths and domains

Fixes issue where setting multiple cookies with the same name but different paths would overwrite each other. Now cookies are stored with unique keys based on domain, path, and name, allowing proper handling of multiple cookies with identical names but different scopes.

The `cookies.get()` method has been extended to accept optional `domain` and `path` options to retrieve specific cookies:

```js
// Set cookies with same name but different paths
cookies.set('session', 'user1', { path: '/admin' });
cookies.set('session', 'user2', { path: '/api' });

// Retrieve specific cookies
cookies.get('session', { path: '/admin' }); // returns 'user1'
cookies.get('session', { path: '/api' });   // returns 'user2'
```

Backward compatibility is maintained - existing code that doesn't specify domain/path continues to work as before.