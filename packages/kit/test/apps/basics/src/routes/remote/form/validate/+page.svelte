<script>
	import { my_form } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b']),
		bar: v.picklist(['d', 'e'])
	});
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

	<button>submit</button>
</form>
