## remote_command_redirect

> Redirects are not allowed in commands. Return a result instead and use goto on the client

Remote commands are imperative mutations and cannot redirect. Return the destination or another result from the command, then call [`goto`](https://svelte.dev/docs/kit/$app-navigation#goto) in the browser after awaiting it. Remote forms support redirects when you need a progressively enhanced submission.

## remote_form_multiple_elements

> A form object can only be attached to a single `<form>` element

Each remote form instance tracks one element's input, validation issues and submission state. To render several forms from the same remote function, use `myForm.for(key)` with a different stable key for each element. An instance returned by `.for(key)` must also be attached to only one element; reusing its key does not create a second independent instance. This includes keys such as `0`, `false` and `''`.

## remote_form_mixed_inputs

> Cannot mix and match file and non-file inputs under the same name ("%name%")

Inputs that share an array field must all contain the same kind of data. Use separate fields for file inputs and non-file inputs, and spread the corresponding `form.fields.field.as(...)` props onto each control.

## remote_form_multiple_files

> Can only use the `multiple` attribute when `name` includes a `[]` suffix — consider changing "%name%" to "%name%[]"

Use `form.fields.files.as('file multiple')` rather than adding `multiple` to the props for a single file input. The array suffix tells SvelteKit to collect all selected files instead of a single file.

## remote_form_not_attached

> Cannot call submit() before the form is attached

Spread the remote form object onto a `<form>` element before calling its `submit()` method. Call it from a browser event handler after the element has mounted, and do not submit an instance whose element has been removed.

## remote_form_reserved_field

> `$` is used to collect all FormData validation issues and cannot be used as the `name` of a form control

`form.fields.allIssues()` uses the reserved `$` path for the form's complete issue list. Choose a different field name, including for nested paths and arrays that start with `$`.

## remote_updates_duplicate_override

> Multiple overrides for the same query are not allowed in a single updates() invocation

Pass at most one `withOverride(...)` result for each query instance to `.updates(...)`. Combine changes to the same instance into a single override callback. Different arguments identify different query instances and may each have an override.

## remote_updates_invalid_argument

> updates() expects a query or live query function, query resource, or query override

Pass a query function to update all its active instances, a query resource to update one instance, or a `withOverride(...)` result to apply an optimistic update. A release callback from an integration is also accepted. Do not pass a command, form, prerender function or an arbitrary value.
