<script lang="ts">
	import Keyboard from './Keyboard.svelte';
	import { confetti } from '@neoconfetti/svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import type { PageData, ActionData } from './$types';

	/** @type {import('./$types').PageData} */
	export let data: PageData;

	/** @type {import('./$types').ActionData} */
	export let form: ActionData;

	$: i = data.answers.length;
	$: won = data.answers.at(-1) === 'xxxxx';

	/** @type {Record<string, 'exact' | 'close' | 'missing'>}*/
	let keys: Record<string, 'exact' | 'close' | 'missing'> = {};

	$: {
		keys = {};

		data.guesses.forEach((word, i) => {
			const answer = data.answers[i];

			if (!answer) return;

			for (let i = 0; i < 5; i += 1) {
				const letter = word[i];

				if (answer[i] === 'x') {
					keys[letter] = 'exact';
				} else if (!keys[letter]) {
					keys[letter] = answer[i] === 'c' ? 'close' : 'missing';
				}
			}
		});
	}

	/** @param {string} key */
	function handleKey(key: string) {
		const guess = data.guesses[i];

		if (key === 'Backspace') {
			data.guesses[i] = guess.slice(0, -1);
			if (form?.illegal) form.illegal = false;
		} else if (/^[a-z]$/.test(key) && guess.length < 5) {
			data.guesses[i] = guess + key;
		}
	}
</script>

<div class="game">
	<a class="how-to-play" href="/sverdle/how-to-play">How to play</a>

	<form id="game" method="POST" action="?/enter" use:enhance>
		{#each Array(6) as _, r}
			{@const current = r === i}

			<div class="row" class:current class:illegal={current && form?.illegal}>
				{#each Array(5) as _, c}
					{@const answer = data.answers[r]?.[c] ?? '-'}

					<input
						name={current ? 'guess' : undefined}
						disabled={!current || won}
						readonly
						class:exact={answer === 'x'}
						class:close={answer === 'c'}
						class:selected={!won &&
							(current ? c === Math.min(4, data.guesses[r].length) : undefined)}
						required
						value={data.guesses[r]?.[c] ?? ''}
					/>
				{/each}
			</div>
		{/each}
	</form>

	<div class="controls">
		{#if won || data.answers.length >= 6}
			<form method="POST" action="?/restart" use:enhance>
				<button>
					{won ? 'you won :)' : 'Game over :('} play again?
				</button>
			</form>
		{:else}
			<Keyboard
				{keys}
				canSubmit={data.guesses[i].length === 5}
				on:key={(event) => handleKey(event.detail)}
			/>
		{/if}
	</div>
</div>

{#if browser && won}
	<div
		style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; pointer-events: none"
	>
		<div
			style="position: absolute; left: 50%; top: 30%"
			use:confetti={{
				force: 0.7,
				stageWidth: window.innerWidth,
				stageHeight: window.innerHeight,
				colors: ['#ff3e00', '#40b3ff', '#676778']
			}}
		/>
	</div>
{/if}

<style>
	.game {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex: 1;
	}

	.how-to-play {
		color: var(--color-text);
	}

	.how-to-play::before {
		content: 'i';
		display: inline-block;
		font-size: 0.8em;
		font-weight: 900;
		width: 1em;
		height: 1em;
		padding: 0.2em;
		line-height: 1;
		border: 1.5px solid var(--color-text);
		border-radius: 50%;
		text-align: center;
		margin: 0 0.5em 0 0;
		position: relative;
		top: -0.05em;
	}

	form {
		--width: min(100vw, 40vh, 380px);
		max-width: var(--width);
		align-self: center;
		justify-self: center;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: start;
	}

	#game {
		justify-content: end;
	}

	.controls {
		justify-content: center;
		height: min(18vh, 10rem);
	}

	.row {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-gap: 0.2rem;
		margin: 0 0 0.2rem 0;
	}

	.illegal {
		animation: wiggle 0.5s;
	}

	input {
		aspect-ratio: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		box-sizing: border-box;
		text-transform: lowercase;
		border: none;
		font-size: calc(0.08 * var(--width));
		border-radius: 2px;
		background: white;
	}

	input:disabled:not(.exact):not(.close) {
		background: rgba(255, 255, 255, 0.5);
		color: rgba(0, 0, 0, 0.5);
	}

	input.exact {
		background: var(--color-theme-2);
		color: white;
	}

	input.close {
		border: 2px solid var(--color-theme-2);
	}

	input:focus {
		outline: none;
	}

	input.selected {
		outline: 2px solid var(--color-theme-1);
	}

	input:not(:disabled)::selection {
		background: transparent;
		color: var(--color-theme-1);
	}

	.current {
		filter: drop-shadow(3px 3px 10px var(--color-bg-0));
	}

	button {
		width: 100%;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 2px;
		border: none;
	}

	button:focus,
	button:hover {
		background: var(--color-theme-1);
		color: white;
		outline: none;
	}

	@keyframes wiggle {
		0% {
			transform: translateX(0);
		}
		10% {
			transform: translateX(-2px);
		}
		30% {
			transform: translateX(4px);
		}
		50% {
			transform: translateX(-6px);
		}
		70% {
			transform: translateX(+4px);
		}
		90% {
			transform: translateX(-2px);
		}
		100% {
			transform: translateX(0);
		}
	}
</style>
