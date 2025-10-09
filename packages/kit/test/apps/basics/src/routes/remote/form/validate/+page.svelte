<script>
	import { my_form } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e']),
		button: v.optional(v.literal('submitter'))
	});
	let submitter;
	let error_message = '';
	$inspect(my_form.fields.allIssues());
</script>

<form {...my_form.preflight(schema)} oninput={() => my_form.validate()}>
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

<form
	{...my_form.enhance(async ({ submit }) => {
		try {
			await submit();
			error_message = '';
		} catch (error) {
			error_message = error.body?.message || 'Error occurred';
		}
	})}
	id="error-test-form"
>
	{#each my_form.fields.foo.issues() as issue}
		<p class="error-test-issue">{issue.message}</p>
	{/each}

	<input {...my_form.fields.foo.as('text')} id="error-test-foo" />
	<input {...my_form.fields.bar.as('text')} id="error-test-bar" />

	<button type="submit" id="error-test-submit">Submit with error handler</button>
</form>
{#if error_message}
	<p id="error-message">{error_message}</p>
{/if}
