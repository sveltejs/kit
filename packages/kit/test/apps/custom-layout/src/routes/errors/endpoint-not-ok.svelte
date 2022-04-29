<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/errors/endpoint-not-ok.json');
		if (res.ok) {
			return {
				props: await res.json()
			};
		} else {
			return {
				status: res.status,
				error: new Error(res.statusText)
			};
		}
	}
</script>

<h1>this text should not appear</h1>
