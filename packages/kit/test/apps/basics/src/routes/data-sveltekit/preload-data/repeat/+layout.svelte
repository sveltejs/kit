<script>
	import { resolve } from '$app/paths';

	const { children } = $props();
</script>

<ul>
	<li><a id="home" href={resolve('/data-sveltekit/preload-data/repeat')}>home</a></li>
	<li>
		<a
			id="target"
			href={resolve('/data-sveltekit/preload-data/repeat/target')}
			data-sveltekit-preload-data="hover">target</a
		>
	</li>
</ul>

{@render children()}
