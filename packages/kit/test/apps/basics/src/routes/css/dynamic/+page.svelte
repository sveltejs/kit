<script>
	/** @type {typeof import('./Dynamic.svelte').default}*/
	let Dynamic;
</script>

<button
	onclick={async () => {
		Dynamic = (await import('./Dynamic.svelte')).default;
	}}>load component</button
>

<svelte:component this={Dynamic}></svelte:component>
