<script>
	import { enhance } from '$app/forms';
	import { base } from '$app/paths';

	let { data, form } = $props();

	let counter = $state(data.counter);
</script>

<div>
	<div>
		<p>This section is coming from the embed route.</p>

		<p>
			Data loaded from the server:
			{JSON.stringify(data, null, 2)}
		</p>

		<button data-testid="increment" onclick={() => counter++}>Increment</button>

		<output data-testid="counter">
			{counter}
		</output>
	</div>

	<hr />

	<div>
		Forms should be able to be embedded as well.
		<br />
		<br />
		<form action="{base}/embed" method="post" use:enhance>
			<label for="answer">Answer</label>
			<input id="answer" name="answer" required type="text" />
			<button type="submit" data-testid="submit">Submit</button>
			<p data-testid="submitted">
				The answer is {form?.answer || '--'}
			</p>
		</form>
	</div>

	<hr />

	<div>
		How would links work?
		<p>
			<a data-testid="about-link" href="{base}/about">About this widget</a>
		</p>
		<p>Links work as expected (the route loads fine), but we should not update the url bar.</p>
		<p>Maybe this can be improved by using url hashes.</p>
	</div>
</div>

<style>
	div {
		border: 1px solid black;
		padding: 1rem;

		background-color: #008080;
		color: #ddd;
	}
</style>
