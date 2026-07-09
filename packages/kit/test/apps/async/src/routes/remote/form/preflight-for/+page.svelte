<script>
	import { get_value, set_value } from './form.remote.ts';
	import * as v from 'valibot';

	const value = get_value();

	const schema = v.object({
		value: v.pipe(v.number(), v.maxValue(20, 'too big'))
	});

	// preflight().for() ordering — the bug: preflight was lost when chained before for
	const form = set_value.preflight(schema).for('a');
</script>

<p>value.current: {value.current}</p>

<form data-preflight-for {...form}>
	{#each form.fields.value.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input data-preflight-for-input {...form.fields.value.as('number')} />
	<button>submit</button>
</form>

<p data-preflight-for-pending>form.pending: {form.pending}</p>
<p data-preflight-for-result>form.result: {form.result}</p>
