## remote_argument_unsupported

> %type% are not valid remote function arguments

Remote function arguments must be serializable. Pass a regular expression's source and flags separately rather than a `RegExp`, and await promises before passing their resolved values. For custom types, use a [transport hook](https://svelte.dev/docs/kit/hooks#transport) to encode and decode them. Commands support `File` arguments; the promises SvelteKit uses internally to read those files are allowed.

## form_input_missing_value

> %type% inputs must have a value

Pass a value as the second argument to `form.fields.field.as(...)` for hidden and submit inputs, radio buttons and checkbox arrays. Radio buttons and checkbox arrays need an option value to distinguish their choices. A single boolean checkbox instead takes its checked state. This check only runs in development.

## load_invalid_response

> a `load` function %location% returned %type%, but must return a plain object at the top level (i.e. `return {...}`)

A [`load`](https://svelte.dev/docs/kit/load) function provides the properties of the page's `data` object. Return a plain object such as `{ posts }`, rather than an array, a `Response`, a class instance or a primitive at the top level. `null` and `undefined` are allowed when there is no data to return. To return a `Response`, use an endpoint instead.
