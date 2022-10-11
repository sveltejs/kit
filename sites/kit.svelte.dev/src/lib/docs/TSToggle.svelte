<script>
	import Checkbox from './Checkbox.svelte';

	export let checked;
</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="input-output-toggle">
	JavaScript <Checkbox bind:checked /> TypeScript
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
</style>
