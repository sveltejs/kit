You may use these playgrounds to experiment with your changes to SvelteKit. Make sure you don't check in any changes to the files in `src` that aren't already gitignored. The easiest way to do this is to run the following from the root of the project:

```bash
git update-index --skip-worktree playgrounds/basic/src/routes/+layout.svelte
git update-index --skip-worktree playgrounds/basic/src/routes/+page.svelte
```

Alternatively, clone the [kit-sandbox](https://github.com/sveltejs/kit-sandbox) repo next to the `kit` repo, and use `pnpm link` to link your dependencies. This way you can have multiple different sandbox projects in different branches, and you never need to worry about accidentally committing throwaway code.
