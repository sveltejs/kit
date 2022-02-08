<script>
	import { searching, query } from './stores.js';
</script>

<div class="search-container">
	<input
		id="search"
		on:input={(e) => {
			$searching = true;
			$query = e.target.value;
			e.target.value = '';
		}}
		on:mousedown|preventDefault={() => ($searching = true)}
		on:touchstart|preventDefault={() => ($searching = true)}
		type="search"
	/>

	<label for="#search">
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
			/>
		</svg>

		<span>Search</span> <kbd>{navigator.platform === 'MacIntel' ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd>
	</label>
</div>

<style>
	.search-container {
		position: relative;
		display: flex;
		align-items: center;
		animation: fade-in 0.2s;
		width: 100%;
		height: 100%;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	input {
		padding: 0.5em 0.5em 0.4em 0.5em;
		border: 1px solid #ccc;
		font-family: inherit;
		font-size: 1.6rem;
	}

	input[type='search'] {
		text-align: center;
	}

	.search-container svg {
		position: absolute;
		display: inline;
		width: 1.6rem;
		height: 1.6rem;
		left: 1rem;
		top: calc(50% - 0.8rem);
		color: #ccc;
	}

	.search-container input {
		width: 100%;
		height: 3.2rem;
		border-radius: var(--border-r);
	}

	.search-container input:focus + label {
		display: none;
	}

	.search-container label {
		color: #666;
		position: absolute;
		top: calc(50% - 0.9rem);
		width: 100%;
		text-align: center;
		pointer-events: none;
		font-size: 1.2rem;
		text-transform: uppercase;
	}

	.search-container kbd {
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

		.search-container label {
			text-align: right;
			padding: 0 1.6rem 0 0;
		}

		.search-container span {
			display: none;
		}

		.search-container input {
			border-radius: 1.6rem;
		}

		/* we're using media query as an imperfect proxy for mobile/desktop */
		.search-container kbd {
			display: inline;
		}
	}

	@media (min-width: 960px) {
		.search-container {
			width: 100%;
		}

		.search-container label {
			text-align: center;
		}

		.search-container span {
			display: inline;
		}
	}
</style>
