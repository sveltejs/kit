<script>
	let visible = true;

	function toggle() {
		visible = !visible;
	}
</script>

{#if visible}
	<button on:click={toggle}>remove</button>
{:else}
	<button on:click={toggle}>add</button>
{/if}
