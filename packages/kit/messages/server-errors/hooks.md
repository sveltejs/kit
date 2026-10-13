## handle_error_hook_failed

> The `handleError` hook failed

Your [`handleError`](https://svelte.dev/docs/kit/hooks#handleError) hook threw an error (or returned a promise that rejected) while it was handling another error. The `cause` of this error is what the hook threw, and the error it was handling is logged after it. SvelteKit responds with a generic `Internal Error` instead of the hook's result. Make sure the hook can handle any value, since anything can be thrown — for example, check `error instanceof Error` before reading `error.message`, and catch failures of any service that it reports errors to.
