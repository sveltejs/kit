<script context="module">
	export async function load() {
		const data = 'Hello from Index!';
		return { props: { data } };
	}
</script>

<script>
	export let data;
</script>

<h3>Index</h3>

<p>Data: {data}</p>
