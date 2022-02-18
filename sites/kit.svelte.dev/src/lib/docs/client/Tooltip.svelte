<script>
	export let text = '';
	export let x = 0;
	export let y = 0;
</script>

<div class="tooltip" style="left: {x}px; top: {y}px">
	{text}
</div>

<style>
	.tooltip {
		--bg: var(--second);
		--offset: -1rem;
		--arrow-size: 0.4rem;
		position: absolute;
		transform: translate(var(--offset), calc(2rem + var(--arrow-size)));
		margin: 0 2rem 0 0;
		background-color: var(--bg);
		color: #fff;
		text-align: left;
		padding: 0.4rem 0.6rem;
		border-radius: var(--border-r);
		font-family: var(--font-mono);
		font-size: 1.2rem;
		white-space: pre-wrap;
		z-index: 100;
		filter: drop-shadow(2px 4px 6px #67677866);
	}

	.tooltip::after {
		content: '';
		position: absolute;
		left: calc(-1 * var(--offset) - var(--arrow-size));
		top: calc(-2 * var(--arrow-size));
		border: var(--arrow-size) solid transparent;
		border-bottom-color: var(--bg);
	}
</style>
