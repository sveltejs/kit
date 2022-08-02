<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').Data} */
	export let data
</script>

<h2>x: {data.x}: {data.loads}</h2>

<button
	on:click={async () => {
		await invalidate((dep) => dep.includes('change-detection/data.json'));
		window.invalidated = true;
	}}>invalidate change-detection/data.json</button
>
