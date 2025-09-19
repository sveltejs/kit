<script>
	import { get_number, set_number } from './form.remote.js';
	import * as v from 'valibot';

	const number = get_number();

	const enhanced = set_number.for('enhanced');

	const schema = v.object({
		number: v.pipe(
			v.string(),
			v.regex(/^\d+$/),
			v.transform((n) => +n),
			v.maxValue(20, 'too big')
		)
	});
</script>

<p>number.current: {number.current}</p>

<!-- TODO use await here once async lands -->
{#await number then n}
	<p>await get_number(): {n}</p>
{/await}

<hr />

<form data-default {...set_number.preflight(schema)}>
	{#if set_number.fields.number.issues()}
		<p>{set_number.fields.number.issues()[0].message}</p>
	{/if}

	<input
		type="number"
		name={set_number.fields.number.name()}
		value={set_number.fields.number.value()}
	/>
	<button>set number</button>
</form>

<p>set_number.input.number: {set_number.fields.number.value()}</p>
<p>set_number.pending: {set_number.pending}</p>
<p>set_number.result: {set_number.result}</p>

<hr />

<form
	data-enhanced
	{...enhanced.preflight(schema).enhance(async ({ submit }) => {
		await submit();
	})}
>
	{#if enhanced.fields.number.issues()}
		<p>{enhanced.fields.number.issues()[0].message}</p>
	{/if}

	<input
		type="number"
		name={enhanced.fields.number.name()}
		value={enhanced.fields.number.value()}
	/>
	<button><span>set enhanced number</span></button>
</form>

<p>enhanced.input.number: {enhanced.fields.number.value()}</p>
<p>enhanced.pending: {enhanced.pending}</p>
<p>enhanced.result: {enhanced.result}</p>
