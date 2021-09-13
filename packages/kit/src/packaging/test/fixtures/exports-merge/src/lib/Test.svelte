<script>
    import { createEventDispatcher } from 'svelte';
    /**
     * @type {string}
     */
    export const astring;

    const dispatch = createEventDispatcher();
    dispatch('event', true);
</script>

<slot {astring} />
