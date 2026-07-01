<script>
	let visible = true;

	function toggle() {
		visible = !visible;
	}
</script>

{#if visible}
	<button onclick={toggle}>remove</button>

	<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<a onclick={toggle}>remove</a>
{:else}
	<button onclick={toggle}>add</button>

	<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<a onclick={toggle}>add</a>
{/if}
