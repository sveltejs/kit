<script lang="ts">
	import { details, select_category } from './form.remote';

	const category = $derived(select_category.result?.category);
	const cached_query = $derived(details(category ?? ''));
	let result = $state('not run');
</script>

<form {...select_category}>
	<input id="category" {...select_category.fields.category.as('text')} />
	<button>select category</button>
</form>

<p id="selected">{category ?? 'none'}</p>
<p id="result">{result}</p>

<button
	id="run"
	type="button"
	onclick={async () => {
		result = await cached_query;
	}}>run query</button
>
