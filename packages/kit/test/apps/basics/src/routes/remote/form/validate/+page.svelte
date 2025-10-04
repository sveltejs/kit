<script>
	import { my_form } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b']),
		bar: v.picklist(['d', 'e']),
		button: v.literal('submitter')
	});
	let submitter;
	$inspect(my_form.issues);
</script>

<form {...my_form.preflight(schema)} oninput={() => my_form.validate()}>
	{#if my_form.issues.foo}
		<p>{my_form.issues.foo[0].message}</p>
	{/if}

	<input name={my_form.field('foo')} />

	{#if my_form.issues.bar}
		<p>{my_form.issues.bar[0].message}</p>
	{/if}

	<input name={my_form.field('bar')} />

	<button bind:this={submitter} name={my_form.field('button')} value="incorrect_value">
		submit
	</button>
	{#if my_form.issues.button}
		<p>{my_form.issues.button[0].message}</p>
	{/if}
</form>
<button
	id="trigger-validate"
	onclick={() => my_form.validate({ includeUntouched: true, submitter })}
>
	trigger validation
</button>
