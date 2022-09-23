# create-svelte

A CLI for creating new [SvelteKit](https://kit.svelte.dev) projects. Just run...

```bash
npm create svelte@latest
```

...and follow the prompts.

## Arguments

Some or all of the prompts can be skipped by supplying arguments directly to the CLI:

```bash
npm create svelte@latest my-directory \
  --name=my-new-app \
  --template=default|skeleton|skeletonlib \
  --types=checkjs|typescript|none \
  --prettier|--no-prettier  \
  --eslint|--no-eslint \
  --playwright|--no-playwright
```

## API

You can also use `create-svelte` programmatically:

```js
import { create } from 'create-svelte';

await create('my-new-app', {
  name: 'my-new-app',
  template: 'default', // or 'skeleton' or 'skeletonlib'
  types: 'checkjs', // or 'typescript' or null;
  prettier: false,
  eslint: false,
  playwright: false
});
```

`checkjs` means your project will use TypeScript to typecheck JavaScript via [JSDoc comments](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

## License

[MIT](../../LICENSE).
