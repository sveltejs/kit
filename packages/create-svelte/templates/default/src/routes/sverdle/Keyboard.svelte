<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';

	/** @type {Record<string, 'exact' | 'close' | 'missing'>}*/
	export let keys: Record<string, 'exact' | 'close' | 'missing'>;

	/** @type {boolean} */
	export let canSubmit: boolean;

	/** @param {KeyboardEvent} event */
	function handleKeydown(event: KeyboardEvent) {
		document.querySelector(`[data-key="${event.key}"]`)?.dispatchEvent(new MouseEvent('click'));
	}

	const dispatch = createEventDispatcher();
</script>

<svelte:window on:keydown={handleKeydown} />

<form
	method="POST"
	use:enhance={({ action, cancel }) => {
		dispatch('key', action.searchParams.get('key'));
		cancel();
	}}
>
	<button data-key="Enter" form="game" disabled={!canSubmit}>⏎</button>
	<button data-key="Backspace" formaction="?/keyboard&key=Backspace">⤆</button>

	{#each ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] as row}
		<div class="row">
			{#each row as letter}
				<button
					data-key={letter}
					class={keys[letter]}
					disabled={canSubmit}
					formaction="?/keyboard&key={letter}"
				>
					{letter}
				</button>
			{/each}
		</div>
	{/each}
</form>

<style>
	form {
		--gap: 0.2rem;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		height: 100%;
	}

	.row {
		display: flex;
		justify-content: center;
		gap: 0.2rem;
		flex: 1;
	}

	button,
	button:disabled {
		--size: min(8vw, 4vh, 40px);
		background-color: white;
		color: black;
		width: var(--size);
		border: none;
		border-radius: 2px;
		font-size: calc(var(--size) * 0.5);
	}

	button.exact {
		background: var(--color-theme-2);
		color: white;
	}

	button.missing {
		opacity: 0.5;
	}

	button.close {
		border: 2px solid var(--color-theme-2);
	}

	button:focus {
		background: var(--color-theme-1);
		color: white;
		outline: none;
	}

	[data-key='Enter'],
	[data-key='Backspace'] {
		position: absolute;
		bottom: 0;
		width: calc(1.5 * var(--size));
		height: calc(1 / 3 * (100% - 2 * var(--gap)));
	}

	[data-key='Enter'] {
		right: calc(50% + 3.5 * var(--size) + 0.8rem);
	}

	[data-key='Backspace'] {
		left: calc(50% + 3.5 * var(--size) + 0.8rem);
	}

	[data-key='Enter']:disabled {
		opacity: 0.5;
	}
</style>
