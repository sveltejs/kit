<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export const astring: string;

    const dispatch = createEventDispatcher();
    dispatch('event', true);
</script>

<slot {astring} />
