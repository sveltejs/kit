<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export const astring: string = 'potato';

	const dispatch = createEventDispatcher<{ event: boolean }>();
	dispatch('event', true);
</script>

<slot {astring} />
