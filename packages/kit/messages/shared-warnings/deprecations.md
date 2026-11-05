## error_body_deprecated

> Passing an `App.Error` body as the second argument is deprecated — pass the `message` as the second argument, and any additional properties as the third

[`error`](https://svelte.dev/docs/kit/@sveltejs-kit#error) now takes the message and any additional [`App.Error`](https://svelte.dev/docs/kit/types#Error) properties as separate arguments:

```js
import { error } from '@sveltejs/kit';

// instead of error(404, { message: 'Not found', code: 'NOT_FOUND' })
error(404, 'Not found', { code: 'NOT_FOUND' });
```

## asset_leading_slash

> `asset('%path%')` should now be `asset('%fixed%')`

Paths passed to [`asset`](https://svelte.dev/docs/kit/$app-paths#asset) are relative to your `static` directory and no longer start with `/`. The leading slash is still removed for you for now, but this will stop working in SvelteKit 4, so remove it.

## app_environment_deprecated

> `$app/environment` is deprecated, use `$app/env` instead

The `$app/environment` module has been renamed to [`$app/env`](https://svelte.dev/docs/kit/$app-env), which exports the same values and can also be imported in service workers. Replace `'$app/environment'` with `'$app/env'` in your imports. `$app/environment` will be removed in SvelteKit 4.

## env_module_deprecated

> `%module%` is deprecated, use `%replacement%` instead

The `$env/*` modules are replaced by [explicit environment variables](https://svelte.dev/docs/kit/environment-variables). Declare each variable in `src/env` with [`defineEnvVars`](https://svelte.dev/docs/kit/@sveltejs-kit-env#defineEnvVars), then import it from [`$app/env/private`](https://svelte.dev/docs/kit/$app-env-private) or [`$app/env/public`](https://svelte.dev/docs/kit/$app-env-public). Declared variables can be validated, documented, and marked as [static](https://svelte.dev/docs/kit/environment-variables#Static-variables) to be inlined at build time. The `$env/*` modules will be removed in SvelteKit 4.

## handle_error_status_deprecated

> The `status` property of `handleError` is deprecated. Use `error.status` for expected and framework errors, or `500` for unexpected errors.

The [`handleError`](https://svelte.dev/docs/kit/hooks#handleError) hook now receives a `kind` that says where the error came from. For `'app'` and `'framework'` errors the status is `error.status`, and `'unknown'` errors always have status `500`. Check `kind` instead of reading the top-level `status`.

## handle_error_message_deprecated

> The `message` property of `handleError` is deprecated. Use `error.message` for expected and framework errors, or `'Internal Error'` for unexpected errors.

The [`handleError`](https://svelte.dev/docs/kit/hooks#handleError) hook now receives a `kind` that says where the error came from. For `'app'` and `'framework'` errors the safe message is `error.message`. For `'unknown'` errors the message shown to users defaults to `'Internal Error'`, because the thrown error's own message may contain sensitive information. Check `kind` instead of reading the top-level `message`.
