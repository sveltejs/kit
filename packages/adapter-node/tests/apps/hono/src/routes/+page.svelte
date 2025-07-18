<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>Welcome to SvelteKit</h1>

2 + 2 = {data.sum}

<h2>Pages:</h2>

<ul>
	<li><a href="images">images</a></li>
</ul>
