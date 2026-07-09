<script>
	import { refresh, refreshAll } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h2>x: {data.x}: {data.loads}</h2>

<button
	onclick={async () => {
		window.invalidated = false;
		await refresh((url) => url.pathname.includes('change-detection/data.json'));
		window.invalidated = true;
	}}>refresh change-detection/data.json</button
>

<button
	onclick={async () => {
		window.invalidated = false;
		await refreshAll();
		window.invalidated = true;
	}}>refresh all</button
>
