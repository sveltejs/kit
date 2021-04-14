---
title: Recipes
---

### Redirect a user in an endpoint

If you want to redirect a user after they hit one of your Svelte endpoints in the browser, 
you can return a [`Location` header](developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location) in your endpoint like so:

```js
export async function get() {
  // Do something in your endpoint here...
  return {
    headers: { Location: '/success' },
    body: 'Redirecting you...',
    status: 302
  }
}
```

### Accessing environment variables

See [this section in the FAQ](https://kit.svelte.dev/faq#how-do-i-use-environment-variables).
