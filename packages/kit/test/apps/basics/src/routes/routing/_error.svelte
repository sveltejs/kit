<script>
	/** @type {number} */
	export let status;

	/** @type {Error} */
	export let error;
</script>

<h1>{status}</h1>

<p>{error.message}</p>

<pre>{error.stack}</pre>
