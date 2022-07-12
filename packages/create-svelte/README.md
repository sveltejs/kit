# create-svelte

A CLI for creating new [SvelteKit](https://kit.svelte.dev) projects. Just run...

```bash
npm init svelte
```

...and follow the prompts.

## API

You can also use `create-svelte` programmatically:

```js
import { create } from 'create-svelte';

await create('my-new-app', {
  name: 'my-new-app',
  template: 'default', // or 'skeleton'
  types: 'checkjs', // or 'typescript' or null;
  prettier: false,
  eslint: false,
  playwright: false
});
```

`checkjs` means your project will use TypeScript to typecheck JavaScript via [JSDoc comments](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html).

## License

[MIT](../../LICENSE).
