<script>
	import { invalidate, invalidateAll } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h2>x: {data.x}: {data.loads}</h2>

<button
	on:click={async () => {
		window.invalidated = false;
		await invalidate((url) => url.pathname.includes('change-detection/data.json'));
		window.invalidated = true;
	}}>invalidate change-detection/data.json</button
>

<button
	on:click={async () => {
		window.invalidated = false;
		await invalidateAll();
		window.invalidated = true;
	}}>invalidate all</button
>
