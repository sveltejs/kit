<script>
	import { get_transformed_data, update_data, set_data } from './form.remote.ts';

	const key = 42;
	const result = $derived(await get_transformed_data(key));
</script>

<h1>Transform Refresh Test</h1>

<p id="result">{result}</p>

<button id="update-btn" onclick={() => update_data().updates(get_transformed_data(key))}>
	Update and Refresh All
</button>

<button id="set-btn" onclick={() => set_data().updates(get_transformed_data(key))}>
	Set via requested
</button>
