<script>
	import { issue_path_form, my_form } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e']),
		button: v.optional(v.literal('submitter'))
	});
	let submitter;
	$inspect(my_form.fields.allIssues());
</script>

<form id="my-form" {...my_form.preflight(schema)} oninput={() => my_form.validate()}>
	{#each my_form.fields.foo.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form.fields.foo.as('text')} />

	{#each my_form.fields.bar.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form.fields.bar.as('text')} />

	<button>submit (imperative validation)</button>

	<button bind:this={submitter} {...my_form.fields.button.as('submit', 'incorrect_value')}>
		submit
	</button>
	{#each my_form.fields.button.issues() as issue}
		<p>{issue.message}</p>
	{/each}
</form>
<button
	id="trigger-validate"
	onclick={() => my_form.validate({ includeUntouched: true, submitter })}
>
	trigger validation
</button>

<form id="issue-path-form" {...issue_path_form}>
	<input {...issue_path_form.fields.nested.value.as('text')} />
	<button
		type="button"
		id="validate"
		onclick={() => issue_path_form.validate({ includeUntouched: true })}
	>
		Validate
	</button>
	<pre id="allIssues">{JSON.stringify(issue_path_form.fields.allIssues())}</pre>
</form>
