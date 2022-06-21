<script>
	import { browser } from '$app/env';
	import { searching, query } from './stores.js';

	export let q = '';
</script>

<form class="search-container" action="/search">
	<input
		id="search"
		value={q}
		on:input={(e) => {
			$searching = true;
			$query = e.target.value;
			e.target.value = '';
		}}
		on:mousedown|preventDefault={() => ($searching = true)}
		on:touchend|preventDefault={() => ($searching = true)}
		type="search"
		name="q"
		placeholder="Search"
		spellcheck="false"
	/>

	{#if browser}
		<label for="#search">
			<kbd>{navigator.platform === 'MacIntel' ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd>
		</label>
	{/if}
</form>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.search-container {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	input {
		padding: 0.5em 0.5em 0.4em 2em;
		border: 1px solid #ccc;
		font-family: inherit;
		font-size: 1.4rem;
		/* text-align: center; */
		appearance: none;
		-webkit-appearance: none;
		width: 100%;
		height: 3.2rem;
		border-radius: var(--border-r);
		background: no-repeat 1rem 50% / 1em 1em url(../icons/search.svg);
	}

	input:focus + label {
		display: none;
	}

	input::placeholder {
		font-size: 1.2rem;
		text-transform: uppercase;
	}

	label {
		color: #666;
		position: absolute;
		top: calc(50% - 0.9rem);
		right: 0;
		width: 100%;
		text-align: right;
		pointer-events: none;
		font-size: 1.2rem;
		text-transform: uppercase;
		animation: fade-in 0.2s;
	}

	kbd {
		display: none;
		background: #eee;
		border: 1px solid #ddd;
		padding: 0.2rem 0.2rem 0rem 0.2rem;
		color: #666;
		font-size: inherit;
		font-family: inherit;
		border-radius: 2px;
	}

	@media (min-width: 800px) {
		.search-container {
			width: 11rem;
		}

		label {
			padding: 0 1.6rem 0 0;
		}

		input {
			border-radius: 1.6rem;
		}

		input::placeholder {
			opacity: 0;
		}

		/* we're using media query as an imperfect proxy for mobile/desktop */
		kbd {
			display: inline;
		}
	}

	@media (min-width: 960px) {
		.search-container {
			width: 19rem;
		}

		input::placeholder {
			opacity: 1;
		}
	}
</style>
