<script>
	import { resolve } from '$app/paths';

	export let data;
</script>

<h1>{data.greeting}</h1>

<!-- the prerenderer follows this link and imports a route that is not prerendered -->
<a href={resolve('/top-level')}>top level</a>
