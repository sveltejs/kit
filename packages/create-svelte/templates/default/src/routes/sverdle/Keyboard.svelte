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
	class="keyboard"
	method="POST"
	use:enhance={({ action, cancel }) => {
		if (action.searchParams.has('/keyboard')) {
			dispatch('key', action.searchParams.get('key'));
			cancel();
		}
	}}
>
	<button id="enter" data-key="Enter" form="game" disabled={!canSubmit}>⏎</button>
	<button id="backspace" data-key="Backspace" formaction="?/keyboard&key=Backspace">⤆</button>

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
	.keyboard {
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
		--size: min(1vw, 0.5vh, 5px);
		background-color: white;
		color: black;
		width: calc(8 * var(--size));
		border: none;
		border-radius: 2px;
		font-size: calc(var(--size) * 5);
	}

	button.exact {
		background: #40b3ff;
		color: white;
	}

	button.missing {
		opacity: 0.5;
	}

	button.close {
		border: 2px solid #40b3ff;
	}

	button:focus {
		background: #ff3e00;
		color: white;
		outline: none;
	}

	#enter,
	#backspace {
		position: absolute;
		bottom: 0;
		width: calc(12 * var(--size));
		height: calc(1 / 3 * (100% - 2 * var(--gap)));
	}

	#enter {
		right: calc(50% + 28 * var(--size) + 0.8rem);
	}

	#backspace {
		left: calc(50% + 28 * var(--size) + 0.8rem);
	}

	#enter:disabled {
		opacity: 0.5;
	}
</style>
