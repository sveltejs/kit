# svelte-migrate

A CLI for migrating Svelte(Kit) codebases.

Run it using
```
npx svelte-migrate [migration]
```

Or if you're using `pnpm`:

```
pnpm dlx svelte-migrate [migration]
```

## Migrations

| Migration     | From                  | To                    | Guide                                                           |
| ------------- | --------------------- | --------------------- | --------------------------------------------------------------- |
| `sveltekit-2` | SvelteKit 1.0         | SvelteKit 2.0         | [Website](https://kit.svelte.dev/docs/migrating-to-sveltekit-2) |
| `svelte-4`    | Svelte 3              | Svelte 4              | [Website](https://svelte.dev/docs/v4-migration-guide)           |
| `package`     | `@sveltejs/package@1` | `@sveltejs/package@2` | [#8922](https://github.com/sveltejs/kit/pull/8922)              |
| `routes`      | SvelteKit pre-1.0     | SvelteKit 1.0         | [#5774](https://github.com/sveltejs/kit/discussions/5774)       |

Some migrations may annotate your codebase with tasks for completion that you can find by searching for `@migration`.

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/migrate/CHANGELOG.md).
