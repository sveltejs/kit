---
title: Debugging
---

Debugging your server code is particularly easy with [ndb](https://github.com/GoogleChromeLabs/ndb). Install it globally...

```bash
npm install -g ndb
```

...then run SvelteKit:

```bash
ndb npm run dev
```

> This assumes that `npm run dev` runs `sapper dev`. You can also run SvelteKit via [npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner), as in `ndb npx sapper dev`.

Note that you may not see any terminal output for a few seconds while ndb starts up.
