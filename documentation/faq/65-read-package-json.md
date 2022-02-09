---
title: How do I include details from `package.json` in my application?
---

You cannot directly require JSON files, since SvelteKit expects [`svelte.config.js`](/docs/configuration) to be an ES module. If you'd like to include your application's version number or other information from `package.json` in your application, you can load JSON like so:

```js
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', import.meta.url), 'utf8'));
```
