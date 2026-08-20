<script>
	import { issue_path_form, my_form, my_form_2, unmount_form } from './form.remote.ts';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b', 'c']),
		bar: v.picklist(['d', 'e']),
		button: v.literal('submitter')
	});

	const unmount_schema = v.object({
		qux: v.picklist(['a', 'b'])
	});

	let error = $state(false);
	let mounted = $state(true);
	let unmount_error = $state('no error');
</script>

<form
	id="my-form"
	{...my_form.preflight(schema)}
	oninput={() => my_form.validate()}
	onfocusout={() => my_form.validate()}
>
	{#each my_form.fields.foo.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form.fields.foo.as('text')} />

	{#each my_form.fields.bar.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form.fields.bar.as('text')} />

	<button {...my_form.fields.button.as('submit', 'incorrect_value')}> submit </button>

	{#each my_form.fields.button.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<button {...my_form.fields.button.as('submit', 'submitter')}>
		submit (imperative validation)
	</button>
</form>
<button id="trigger-validate" onclick={() => my_form.validate({ all: true })}>
	trigger validation
</button>

<form id="issue-path-form" {...issue_path_form}>
	<input {...issue_path_form.fields.nested.value.as('text')} />
	<button type="button" id="validate" onclick={() => issue_path_form.validate({ all: true })}>
		Validate
	</button>
	<pre id="allIssues">{JSON.stringify(issue_path_form.fields.allIssues())}</pre>
</form>

<form
	id="my-form-2"
	{...my_form_2.enhance(async ({ submit }) => {
		error = false;
		try {
			await submit();
		} catch {
			error = true;
		}
	})}
>
	{#each my_form_2.fields.baz.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...my_form_2.fields.baz.as('text')} />

	<p data-error>{error ? 'An error occurred' : 'No error'}</p>

	<button>submit</button>
</form>

{#if mounted}
	<form id="unmount-form" {...unmount_form.preflight(unmount_schema)}>
		<input {...unmount_form.fields.qux.as('text')} />
	</form>
{/if}

<button
	id="unmount-then-validate"
	onclick={async () => {
		const validated = unmount_form.validate({ all: true });
		mounted = false;

		try {
			await validated;
		} catch (e) {
			unmount_error = /** @type {Error} */ (e).message;
		}
	}}
>
	unmount then validate
</button>
<p id="unmount-error">{unmount_error}</p>
