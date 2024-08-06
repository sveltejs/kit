<script lang="ts">
	import type { PageData } from "./$types";

	export let data: PageData
</script>

<div>
	<h1>Svelte Kit with Vite Node VM Environment</h1>
	<hr />
	<h2>{data.userAgentText}</h2>
	<form method="POST">
		<button>Click me</button>
	</form>
</div>