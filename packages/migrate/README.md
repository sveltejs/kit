# svelte-migrate

A CLI for migrating Svelte(Kit) codebases.

```
npx svelte-migrate [migration]
```

## Migrations

Right now, there's only one migration — `routes`:

```
npx svelte-migrate routes
```

This will update your codebase in readiness for https://github.com/sveltejs/kit/discussions/5748. The script will automate as much of the conversion as possible, then annotate your codebase with tasks for completion that you can find by searching for `@migration`.
