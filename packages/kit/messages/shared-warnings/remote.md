## form_fields_enumerated

> The properties of `form.fields` are virtual, so operators like `in` and `Object.keys` are meaningless. If you need the current value of a form field, use `form.fields.x.value()`

Remote form fields are proxies created as you access them, not enumerable properties. Read `form.fields.value()` to obtain the current form data, or `form.fields.field.value()` for a specific field. Don't spread `form.fields`, enumerate its keys or use `in` to test whether a field has a value. This development-only warning is emitted once per call site.

## depends_special_scheme

> %route%: Calling `depends('%dependency%')` will throw an error in Firefox because `%scheme%` is a special URI scheme

Firefox treats `moz-icon:`, `view-source:` and `jar:` as special URI schemes. For a custom dependency passed to [`depends`](https://svelte.dev/docs/kit/load#Rerunning-load-functions-Manual-invalidation), choose a different application-specific scheme, such as `app:posts`, and use the same identifier when invalidating it.
