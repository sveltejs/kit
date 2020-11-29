<script>
	import { onMount } from 'svelte';

	onMount(() => {
		window.deleted = null;
	});

	function del() {
		fetch('delete-test/42.json', { method: 'DELETE' })
			.then(r => r.json())
			.then(data => {
				window.deleted = data;
			});
	}
</script>

<button class="del" on:click={del}>delete</button>