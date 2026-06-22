<script>
	import { get_count, increment } from './form.remote';

	const { params } = $props();
</script>

<div id="count">Count: {await get_count(params.key)}</div>
<div id="result">Result: {increment.result ?? 'none'}</div>

<form
	{...increment.enhance(async ({ submit }) => {
		await submit().updates();
	})}
>
	<input {...increment.fields.key.as('hidden', params.key)} />
	<button type="submit">Submit</button>
</form>
