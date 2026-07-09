<script>
	import { invalidate, refreshAll } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h2>x: {data.x}: {data.loads}</h2>

<button
	onclick={async () => {
		window.invalidated = false;
		await invalidate((url) => url.pathname.includes('change-detection/data.json'));
		window.invalidated = true;
	}}>invalidate change-detection/data.json</button
>

<button
	onclick={async () => {
		window.invalidated = false;
		await refreshAll();
		window.invalidated = true;
	}}>refresh all</button
>
