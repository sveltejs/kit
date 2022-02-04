<script>
	import { searching, query } from './stores.js';
</script>

<div class="search-container">
	<input
		aria-label="Search"
		on:input={(e) => {
			$searching = true;
			$query = e.target.value;
			// update();
			e.target.value = '';
		}}
		on:mousedown|preventDefault={() => ($searching = true)}
		on:touchstart|preventDefault={() => ($searching = true)}
		type="search"
	/>

	<span>
		<!-- TODO should be ctrl on non-mac -->
		Search <kbd>⌘</kbd> <kbd>K</kbd>
	</span>
</div>

<style>
	.search-container {
		position: relative;
		display: flex;
		align-items: center;
		animation: fade-in 0.2s;
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

	.search-container input {
		width: 100%;
		height: 3.2rem;
		border-radius: var(--border-r);
	}

	@media (min-width: 800px) {
		.search-container input {
			border-radius: 1.6rem;
		}
	}

	.search-container input:focus + span {
		display: none;
	}

	.search-container span {
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
		background: #eee;
		border: 1px solid #ddd;
		padding: 0.2rem 0.2rem 0rem 0.2rem;
		color: #666;
		font-size: inherit;
		font-family: inherit;
		border-radius: 2px;
	}
</style>
