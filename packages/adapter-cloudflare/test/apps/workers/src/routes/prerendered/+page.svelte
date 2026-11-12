<script>
	import { resolve } from '$app/paths';

	export let data;
</script>

<h1>{data.greeting}</h1>
<p id="json">{data.json}</p>
<p id="secret">{data.secret}</p>

<!-- the prerenderer follows this link and imports a route that is not prerendered -->
<a href={resolve('/top-level')}>top level</a>
