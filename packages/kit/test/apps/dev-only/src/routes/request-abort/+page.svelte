<script>
	import { onMount } from 'svelte';

	let result;

	function test_abort() {
		const controller = new AbortController();
		fetch('/request-abort', { method: 'POST', signal: controller.signal }).then((r) => r.json());
		setTimeout(() => {
			controller.abort();
			fetch('/request-abort', { headers: { accept: 'application/json' } }).then(
				async (r) => (result = await r.json())
			);
		}, 100);
	}

	onMount(test_abort);
</script>

<pre>{JSON.stringify(result)}</pre>
