<script context="module">
	export function load({ session }) {
		return {
			props: {
				answer: session.answer
			}
		};
	}
</script>

<script>
	import Counter from '$components/Counter.svelte';

	export let answer;

	let result;

	async function handle_submit(e) {
		e.preventDefault();
		const res = await fetch(this.action, {
			method: this.method,
			body: new FormData(this)
		});
		result = await res.json();
		console.log(result);
	}
</script>

<main>
	<h1>Hello world!</h1>

	<p>the answer is {answer}</p>

	<Counter />
	<p>Visit <a href="https://svelte.dev">svelte.dev</a> to learn how to build Svelte apps.</p>

	<form on:submit={handle_submit} action="/doubler" method="post">
		<input type="number" name="num" value="1" />
		<button>double it</button>
	</form>

	{#if result}
		<p>{result.original} * 2 = {result.doubled}</p>
	{/if}
</main>

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			'Open Sans', 'Helvetica Neue', sans-serif;
	}

	main {
		text-align: center;
		padding: 1em;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4rem;
		font-weight: 100;
		line-height: 1.1;
		margin: 4rem auto;
		max-width: 14rem;
	}

	p {
		max-width: 14rem;
		margin: 2rem auto;
		line-height: 1.35;
	}

	@media (min-width: 480px) {
		h1 {
			max-width: none;
		}

		p {
			max-width: none;
		}
	}
</style>
