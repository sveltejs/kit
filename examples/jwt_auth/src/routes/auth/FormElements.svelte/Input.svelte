<script>
    export let type,value,placeholder
</script>
{#if type=="password"}
    <input type="password" bind:value class="block shadow-lg rounded-lg focus:outline-none shadow-stone-400 focus:shadow-stone-500 p-2 my-4" {placeholder}>
{:else}
    <input type="text" bind:value class="block shadow-lg rounded-lg focus:outline-none shadow-stone-400 focus:shadow-stone-500 p-2 my-4" {placeholder}>
{/if}