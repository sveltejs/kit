<script>
	import { my_form } from './form.remote.js';
	import * as v from 'valibot';

	const my_form_form = my_form();
	const schema = v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e']),
		button: v.optional(v.literal('submitter'))
	});
	let submitter;
	$inspect(my_form_form.fields.allIssues());
</script>

<form {...my_form_form.preflight(schema)} oninput={() => my_form_form.validate()}>
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
