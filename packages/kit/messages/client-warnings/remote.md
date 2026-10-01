## remote_form_issues_ignored

> Form submission had invalid data, but the validation issues were ignored:
>
> %issues%
>
> Make sure you provide actionable feedback to users, using e.g. `myForm.fields.myField.issues()` or `myForm.fields.allIssues()`

A remote form submission or preflight validation failed, but your UI did not read all its issues. Display field-specific issues with `form.fields.field.issues()`, or display all issues with `form.fields.allIssues()`, so the user knows what to fix. The list contains the validator's own issue messages and paths; it does not change those issues. This warning is only emitted in development, after giving the UI time to read them.

## remote_updates_repeated

> Updates can only be sent once per %invocation%. Ignoring additional updates.

Call `.updates(...)` once on a command invocation or form submission, passing every query or override in that call. Subsequent calls are ignored and return the original promise; they do not send more updates. Calling `.updates()` without arguments is still a call and opts out of automatic invalidation.
