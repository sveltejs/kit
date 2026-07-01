<script>
	import { resolve } from '$app/paths';
	import { preloadData } from '$app/navigation';

	let programmatic_preload = $state(false);
</script>

<a href={resolve('/navigation-preload/a')} data-sveltekit-preload-data>go to a</a>

<button
	onclick={async () => {
		await preloadData(resolve('/navigation-preload/a'));
		programmatic_preload = true;
	}}>preload a</button
>

<p>{programmatic_preload ? 'programmatically preloaded' : '...'}</p>
