<script>
	import { onMount } from 'svelte';
	import { getData } from './example.remote';

	let data = $state.raw(new Promise(() => {}));
	onMount(() => {
		data = getData();
	});
</script>

<svelte:boundary>
	<p>a: {(await data).a}</p>

	{#snippet pending()}
		Loading...
	{/snippet}
</svelte:boundary>
