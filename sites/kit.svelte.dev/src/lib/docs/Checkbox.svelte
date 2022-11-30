<script>
	export let checked;
</script>

<input type="checkbox" bind:checked />

<style>
	input[type='checkbox'] {
		--size: 1.2em;
		--bg: var(--sk-theme-2);
		--fg: white;
		--bg-active: var(--bg);
		--fg-active: var(--fg);
		position: relative;
		height: var(--size);
		width: calc(100% - 0.6em);
		max-width: calc(2 * var(--size));
		top: -2px;
		border-radius: 0.5em;
		-webkit-appearance: none;
		appearance: none;
		outline: none;
		border: transparent;
	}

	input[type='checkbox']::before {
		content: '';
		position: absolute;
		display: block;
		height: 100%;
		width: 100%;
		padding: 2px;
		border-radius: var(--size);
		top: 0;
		left: 0;
		background: var(--bg);
		box-sizing: border-box;
	}

	input[type='checkbox']:checked::before {
		background: var(--bg-active);
	}

	input[type='checkbox']::after {
		content: '';
		position: absolute;
		display: block;
		width: calc(var(--size) - 4px);
		height: calc(var(--size) - 4px);
		aspect-ratio: 1;
		top: 2px;
		left: 2px;
		border-radius: 50%;
		background: var(--fg);
		box-shadow: 0 0px 1px rgba(0, 0, 0, 0.4), 0 4px 2px rgba(0, 0, 0, 0.1);
		transition: background 0.2s ease-out, left 0.2s ease-out;
	}

	input[type='checkbox']:checked::after {
		background: var(--fg-active);
		left: calc(100% - var(--size) + 2px);
	}
</style>
