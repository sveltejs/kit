<script>
	import { get_value, set_value } from './form.remote.ts';
	import * as v from 'valibot';

	const value = get_value();

	const schema = v.object({
		value: v.pipe(v.number(), v.maxValue(20, 'too big'))
	});
</script>

<p>value.current: {value.current}</p>

<!-- preflight().for() ordering — the bug: preflight was lost when chained before for -->
<form data-preflight-for {...set_value.preflight(schema).for('a')}>
	{#each set_value.fields.value.issues() as issue}
		<p>{issue.message}</p>
	{/each}

	<input data-preflight-for-input {...set_value.fields.value.as('number')} />
	<button>submit</button>
</form>

<p data-preflight-for-pending>set_value.pending: {set_value.pending}</p>
<p data-preflight-for-result>set_value.result: {set_value.result}</p>
