<script context="module">
	export async function load({ fetch }) {
		const res = await fetch('/errors/endpoint.json');
		if (res.ok) {
			return {
				props: await res.json()
			};
		} else {
			return {
				status: res.status,
				error: new Error(await res.statusText)
			};
		}
	}
</script>

<h1>this text should not appear</h1>
