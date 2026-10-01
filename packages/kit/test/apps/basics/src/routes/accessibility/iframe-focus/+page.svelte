<script>
	let show = false;
	/** @type {HTMLIFrameElement} */
	let iframe;
</script>

<button onclick={() => (show = true)}>Load iframe</button>

{#if show}
	<button onclick={() => iframe.contentWindow?.postMessage('navigate', location.origin)}>
		Navigate iframe
	</button>
	<iframe bind:this={iframe} title="Embedded page" src="/accessibility/iframe-focus/child"></iframe>
{/if}
