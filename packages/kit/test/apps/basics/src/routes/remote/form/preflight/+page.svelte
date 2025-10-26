<script>
	import { get_number, set_number } from './form.remote.js';
	import * as v from 'valibot';

	const number = get_number();

	const number_form = set_number();
	const enhanced = set_number('enhanced');

	const schema = v.object({
		number: v.pipe(v.number(), v.maxValue(20, 'too big'))
	});
</script>

<p>number.current: {number.current}</p>

<!-- TODO use await here once async lands -->
{#await number then n}
	<p>await get_number(): {n}</p>
{/await}

<hr />

<form data-default {...number_form.preflight(schema)}>
	{#each number_form.fields.number.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...number_form.fields.number.as('number')} />
	<button>set number</button>
</form>

<p>set_number.input.number: {number_form.fields.number.value()}</p>
<p>set_number.pending: {number_form.pending}</p>
<p>set_number.result: {number_form.result}</p>

<hr />

<form
	data-enhanced
	{...enhanced.preflight(schema).enhance(async ({ submit }) => {
		await submit();
	})}
>
	{#each enhanced.fields.number.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input {...enhanced.fields.number.as('number')} />
	<button><span>set enhanced number</span></button>
</form>

<p>enhanced.input.number: {enhanced.fields.number.value()}</p>
<p>enhanced.pending: {enhanced.pending}</p>
<p>enhanced.result: {enhanced.result}</p>
