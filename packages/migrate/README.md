# svelte-migrate

A CLI for migrating Svelte(Kit) codebases.

```
npx svelte-migrate [migration]
```

## Migrations

The available migrations are:

- `routes` - This will update your pre-SvelteKit-1.0 codebase to the SvelteKit 1.0 routes format. The script will automate as much of the conversion as possible, then annotate your codebase with tasks for completion that you can find by searching for `@migration`. Read [the discussion](https://github.com/sveltejs/kit/discussions/5748) for full details.
- `package` - Migration to @sveltejs/package v2. Review the migration guide at [#8922](https://github.com/sveltejs/kit/pull/) and read the updated docs at https://kit.svelte.dev/docs/packaging
- `svelte-4` - This will migrate your codebase from Svelte 3 to Svelte 4

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/migrate/CHANGELOG.md).
