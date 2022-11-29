<script>
	export let href;
</script>

<a {href}>Skip to main content</a>

<style>
	a {
		background: white;
		color: var(--sk-text-2);
		border: 2px solid black;
		padding: 8px;
		position: absolute;
		inset-block-start: 0;
		inset-inline-start: 0;
		transform: translateY(-100%);
		z-index: 101; /* 1 more than the nav z-index */
	}

	a:focus {
		transform: translateY(0%);
	}
</style>
