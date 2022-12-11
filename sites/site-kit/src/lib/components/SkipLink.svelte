<script>
	export let href;
</script>

<a {href}>Skip to main content</a>

<style>
	a {
		background: var(--sk-back-1);
		color: var(--sk-text-2);
		border: 2px solid var(--sk-text-1);
		padding: 8px;
		position: absolute;
		inset-block-start: 0;
		inset-inline-start: 0;
		transform: translateY(-999px);
		z-index: 1000; /* 1 more than the banner z-index */
	}

	a:focus {
		transform: translateY(0%);
	}
</style>
