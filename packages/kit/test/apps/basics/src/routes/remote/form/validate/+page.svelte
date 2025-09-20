<script>
	import { my_form } from './form.remote.js';
	import * as v from 'valibot';

	const schema = v.object({
		foo: v.picklist(['a', 'b']),
		bar: v.picklist(['d', 'e'])
	});
</script>

<form {...my_form.preflight(schema)} oninput={() => my_form.validate()}>
	{#if my_form.fields.foo.issues()}
		<p>{my_form.fields.foo.issues()[0].message}</p>
	{/if}

	<input name={my_form.fields.foo.name()} />

	{#if my_form.fields.bar.issues()}
		<p>{my_form.fields.bar.issues()[0].message}</p>
	{/if}

	<input name={my_form.fields.bar.name()} />

	<button>submit</button>
</form>
