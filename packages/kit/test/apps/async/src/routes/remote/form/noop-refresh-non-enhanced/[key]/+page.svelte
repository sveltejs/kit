<script>
	import { get_count, set } from './form.remote';

	const { params } = $props();
</script>

<div id="count">Count: {await get_count(params.key)}</div>

<form {...set}>
	<input {...set.fields.key.as('hidden', params.key)} />
	<button type="submit">Submit</button>
</form>
