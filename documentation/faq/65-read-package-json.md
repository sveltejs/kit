---
title: How do I include details from `package.json` in my application?
---

You cannot directly require JSON files, since SvelteKit expects [`svelte.config.js`](/docs/configuration) to be an ES module. If you'd like to include your application's version number or other information from `package.json` in your application, you can load JSON like so:

```js
/// file: svelte.config.js
// @filename: index.js
/// <reference types="@types/node" />
import { URL } from 'url';
// ---cut---
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);
```
