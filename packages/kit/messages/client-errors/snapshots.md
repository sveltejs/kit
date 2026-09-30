## snapshot_duplicate_id

> snapshot() was called multiple times from the same call site. Pass a unique `id` to distinguish the instances.

> A snapshot with id "%id%" is already registered. Pass a unique `id`.

Each [`snapshot`](https://svelte.dev/docs/kit/snapshots) needs an `id` that is unique among the snapshots mounted at the same time, so that SvelteKit knows which captured value to restore to which component. By default, the `id` is derived from the place in your code where `snapshot` is called, so calling it from a helper function, or from a component that is rendered more than once, produces the same `id` for every instance. Pass an explicit `id` that differs between them, for example one based on a prop.

## snapshot_id_missing

> Could not generate a snapshot id from the stack trace. Pass an `id` instead.

Without an `id` option, [`snapshot`](https://svelte.dev/docs/kit/snapshots) derives one from its call site, using the stack trace of an error. That doesn't work when the environment doesn't provide stack traces (or a library has removed them), so pass an explicit `id`, which also keeps snapshots stable across deployments.
