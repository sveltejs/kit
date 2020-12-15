<script context="module">
	export async function load({ page, context }) {
		return {
			props: {
				...context,
				z: page.params.z
			}
		};
	}
</script>

<script>
	export let message;
	export let x;
	export let y;
	export let z;
</script>

<h1>message: {message}</h1>
<pre>{JSON.stringify({x, y, z})}</pre>