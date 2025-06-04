<script lang="ts">
import { createEventDispatcher } from 'svelte';
export const astring = 'potato';
const dispatch = createEventDispatcher();
dispatch('event', true);
</script>

<slot {astring} />
