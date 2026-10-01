<script>
	import { browser, dev } from '$app/environment';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>Hello from the {browser ? 'client' : 'server'} in {dev ? 'dev' : 'prod'} mode!</h1>
<h2>The answer is {data.answer}</h2>
<p>This text is red</p>

<style>
	p {
		color: red;
	}
</style>
