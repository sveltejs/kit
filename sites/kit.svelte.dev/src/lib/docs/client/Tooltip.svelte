<script>
	import { tick } from 'svelte';

	export let text = '';
	export let x = 0;
	export let y = 0;

	let width = 1;
	let tooltip;

	// bit of a gross hack but it works — this prevents the
	// tooltip from disappearing off the side of the screen
	$: if (text && tooltip) {
		tick().then(() => {
			width = tooltip.getBoundingClientRect().width;
		});
	}
</script>

<div
	bind:this={tooltip}
	class="tooltip"
	style="left: {x}px; top: {y}px; --offset: {Math.min(-10, window.innerWidth - (x + width + 10))}px"
>
	<span>{text}</span>
</div>

<style>
	.tooltip {
		--bg: var(--second);
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
