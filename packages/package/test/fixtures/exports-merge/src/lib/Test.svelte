<script>
	import { createEventDispatcher } from 'svelte';
	/**
	 * @type {string}
	 */
	export const astring = 'potato';

	const dispatch = createEventDispatcher();
	dispatch('event', true);
</script>

<slot {astring} />
