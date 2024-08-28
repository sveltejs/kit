<script lang="ts">
	import type { PageData } from "./$types";

	export let data: PageData
</script>

<div>
	<h1>Svelte Kit with Vite Node Environment</h1>
<nav>
	<ul>
		<li><a href="/">Home</a></li>
		<li><a href="/about">About</a></li>
		<li><a href="/endpoint">Endpoint</a></li>
	</ul>
</nav>
	<hr />
	<h2>{data.userAgentText}</h2>
	<form method="POST">
		<button>Click me</button>
	</form>
</div>

<style>
	h1 {
		color: red;
	}
</style>