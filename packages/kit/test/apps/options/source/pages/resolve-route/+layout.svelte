<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<a href={resolve('/resolve-route')}>ROOT resolve-route</a>

<hr />
<pre>{JSON.stringify({ ['page.route.id']: page.route.id, params: page.params }, null, 2)}</pre>

{@render children()}
<hr />
