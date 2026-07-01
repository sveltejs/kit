<script>
	import { resolve } from '$app/paths';
	import { preloadCode } from '$app/navigation';

	let programmatic_preload = $state(false);
</script>

<a href={resolve('/')} data-sveltekit-preload-code>go home</a>

<button
	onclick={async () => {
		await preloadCode(resolve('/'));
		programmatic_preload = true;
	}}>preload home</button
>

<p>{programmatic_preload ? 'programmatically preloaded' : '...'}</p>
