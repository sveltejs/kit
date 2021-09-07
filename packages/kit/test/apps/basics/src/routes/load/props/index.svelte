<script context="module">
	export async function load() {
		const data = 'Hello from Index!';
		return { props: { data } };
	}
</script>

<script>
	export let data = 'undefined';
</script>

<h3>Index</h3>

<p>Data: {data}</p>
