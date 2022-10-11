<script>
	export let checked;
	import Checkbox from './Checkbox.svelte';
</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="input-output-toggle">
	<span>Code:</span>
	<span class:active={!checked} style="text-align: right">JS</span>
	<Checkbox bind:checked />
	<span class:active={checked}>TS</span>
</label>

<style>
	.input-output-toggle {
		position: relative;
		display: flex;
		gap: 0.5em;
		user-select: none;
		align-items: center;
		width: 100%;
		height: 42px;
		z-index: 2;
		padding: 0 3.2rem;
	}

	span {
		color: #ccc;
	}

	.active {
		color: #555;
	}
</style>
