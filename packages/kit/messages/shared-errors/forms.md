## form_field_unbound

> Form contained a field that wasn't created with form.fields.as(...): %name%

Spread the props from `myForm.fields.field.as(...)` onto every named control in a remote form. These props encode the field's type and the form it belongs to. Don't replace the generated `name` with a handwritten name or reuse props from a different remote form.

## form_field_duplicate

> Form cannot contain duplicated keys — "%name%" has %count% values

A single-value field cannot receive several submitted values. Give independent controls different field names. For an array of choices or multiple files, use the corresponding array input props, such as `form.fields.choices.as('checkbox', 'option')` or `form.fields.files.as('file multiple')`, so the generated name has an array suffix.

## form_field_invalid_name

> Invalid field name %name%: field names are written in JS object notation, so keys that would need quoting are not supported. See https://svelte.dev/docs/kit/remote-functions#form-Fields

Remote form field paths use identifiers separated by dots and numeric array indexes in brackets, such as `user.name` or `items[0].title`. Use a schema whose field names can be expressed with this notation. Keys containing spaces, hyphens or other characters requiring quotes are not supported.

## form_field_forbidden_key

> Invalid key "%key%": This key is not allowed to prevent prototype pollution.

Remote form field paths cannot contain `__proto__`, `constructor` or `prototype`. These names could modify an object's prototype rather than its data. Rename the field in both the form and its schema. Never use untrusted input to construct field paths without validating it.

## form_field_array_conflict

> Invalid array key %key%

The same form field path is being used as both an array and an object. Check the names of nested controls and the values passed to `form.fields.field.set(...)`. Numeric indexes must address arrays, while named properties must address objects. Don't mix paths such as `items[0]` and `items.title`.
