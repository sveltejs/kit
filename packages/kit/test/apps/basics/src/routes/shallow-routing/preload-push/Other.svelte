<script>
	import { preloadData } from '$app/navigation';

	let loadResult = $state('-');

	async function preload() {
		const result = await preloadData(`/shallow-routing/target?now=${Date.now()}`);
		if (result.type === 'loaded') {
			loadResult = result.data.message;
		}
	}
</script>

<div id="other-component">
	<p id="result">Result: {loadResult}</p>
	<button onclick={preload}>Preload</button>
</div>
