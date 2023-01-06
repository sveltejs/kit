<script>
	let visible = true;

	function toggle() {
		visible = !visible;
	}
</script>

{#if visible}
	<button on:click={toggle}>remove</button>

	<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
	<a on:click={toggle}>remove</a>
{:else}
	<button on:click={toggle}>add</button>

	<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
	<a on:click={toggle}>add</a>
{/if}
