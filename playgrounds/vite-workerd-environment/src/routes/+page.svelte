<script lang="ts">
	import type { PageData } from "./$types";

	export let data: PageData
</script>

<div>
	<h1>Svelte Kit with Vite Workerd Environment</h1>
<nav>
	<ul>
		<li><a href="/">Home</a></li>
		<li><a href="/about">About</a></li>
		<li><a href="/cf-properties">Cloudflare Properties</a></li>
		<li><a href="/endpoint">Endpoint</a></li>
		<li><a href="/matchers/apple">Matchers</a></li>
	</ul>
</nav>
	<hr />
	<h2>{data.userAgentText}</h2>
	<hr />
	<h2>KV example</h2>
	{#if data.value}
		<p>Value: {data.value}</p>
		<form method='POST' action='?/delete'>
			<button>Delete</button>
		</form>
	{:else}
		<p>No value</p>
		<form method='POST' action='?/create'>
			<label for="value">Set value: </label>
			<input type="text" name="value" id="value" required />
			<br />
			<button>Save</button>
		</form>
	{/if}
</div>

<style>
	h1 {
		color: red;
	}
</style>