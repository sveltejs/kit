<script>
	import './index.css';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>the answer is {data.answer}</h1>

<a href="/routing/trailing-slash/never/"
	>URL with trailing slash that should redirect to remove it</a
>
