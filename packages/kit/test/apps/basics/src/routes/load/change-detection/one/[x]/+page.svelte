<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h2>x: {data.x}: {data.loads}</h2>

<button
	on:click={async () => {
		window.invalidated = false;
		await invalidate((dep) => dep.includes('change-detection/data.json'));
		window.invalidated = true;
	}}>invalidate change-detection/data.json</button
>

<button
	on:click={async () => {
		window.invalidated = false;
		await invalidate();
		window.invalidated = true;
	}}>invalidate all</button
>
