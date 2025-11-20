<script>
	import { issue_path_form, my_form, my_form_2 } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e']),
		button: v.optional(v.literal('submitter'))
	});
	const my_form_form = my_form({
		preflight: schema
	});
	const my_form_2_form = my_form_2();
	let submitter;

	$inspect(my_form_form.fields.allIssues());
	let error = $state(false);
</script>

<form id="my-form" {...my_form_form} oninput={() => my_form_form.validate()}>
	{#each my_form_form.fields.foo.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form_form.fields.foo.as('text')} />

	{#each my_form_form.fields.bar.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form_form.fields.bar.as('text')} />

	<button>submit (imperative validation)</button>

	<button bind:this={submitter} {...my_form_form.fields.button.as('submit', 'incorrect_value')}>
		submit
	</button>
	{#each my_form_form.fields.button.issues() as issue}
		<p>{issue.message}</p>
	{/each}
</form>

<button
	id="trigger-validate"
	onclick={() => my_form_form.validate({ includeUntouched: true, submitter })}
>
	trigger validation
</button>

<form id="issue-path-form" {...issue_path_form()}>
	<input {...issue_path_form().fields.nested.value.as('text')} />
	<button
		type="button"
		id="validate"
		onclick={() => issue_path_form().validate({ includeUntouched: true })}
	>
		Validate
	</button>
	<pre id="allIssues">{JSON.stringify(issue_path_form().fields.allIssues())}</pre>
</form>

<form
	id="my-form-2"
	{...my_form_2_form.enhance(async ({ submit }) => {
		error = false;
		try {
			await submit();
		} catch {
			error = true;
		}
	})}
>
	{#each my_form_2_form.fields.baz.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form_2_form.fields.baz.as('text')} />

	<p data-error>{error ? 'An error occurred' : 'No error'}</p>

	<button>submit</button>
</form>
