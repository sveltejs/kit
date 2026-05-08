<script lang="ts">
	import type { RemoteQuery } from '@sveltejs/kit';
	import { get_count } from '../../query-command.remote.js';

	const { expose }: { expose: (query: RemoteQuery<number>) => void } = $props();

	const tracked = get_count();
	// svelte-ignore state_referenced_locally
	expose(tracked);
</script>

<p id="tracked-child">tracked query ready</p>
