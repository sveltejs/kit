<script>
	/** @type {typeof import('./Dynamic.svelte').default}*/
	let Dynamic;
</script>

<button
	on:click={async () => {
		Dynamic = (await import('./Dynamic.svelte')).default;
	}}>load component</button
>

<svelte:component this={Dynamic}></svelte:component>
