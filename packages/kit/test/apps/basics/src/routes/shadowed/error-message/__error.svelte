<script context="module">
	export function load({status, error}) {
		return {
			props: {status,error}
		};
	}
</script>

<script>
	export let status,error;
</script>

<h1>{status}</h1>
<p>{error.message}</p>
