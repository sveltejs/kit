<script>
	export let checked;
	import Checkbox from './Checkbox.svelte'
</script>

<style>
	.input-output-toggle {
		position: relative;
		display: grid;
		user-select: none;
		flex: 0;
		grid-template-columns: 1fr 40px 1fr;
		grid-gap: 0.5em;
		align-items: center;
		width: 100%;
		height: 42px;
		z-index: 2;
	}

	span { color: #ccc }
	.active { color: #555 }

    .header {
        display: block;
        padding-top: 0.5em;
        text-align: center;
    }
</style>

<span class="header active">Code snippets</span>
<!-- svelte-ignore a11y-label-has-associated-control -->
<label class="input-output-toggle">
	<span class:active={!checked} style="text-align: right">JS</span>
	<Checkbox bind:checked />
	<span class:active={checked}>TS</span>
</label>
