<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const a = await fetch('/encoding/path with spaces.json');
		const b = await fetch('/encoding/path%20with%20encoded%20spaces.json');

		return {
			props: {
				a: await a.json(),
				b: await b.json()
			}
		};
	}
</script>

<script>
	/** @type {{ path: string }} */
	export let a;

	/** @type {{ path: string }} */
	export let b;
</script>

<p id="a">{a.path}</p>
<p id="b">{b.path}</p>

<a href="/encoding/dynamic path with spaces">dynamic path with spaces</a>
<a href="/encoding/dynamic%20path%20with%20encoded%20spaces">dynamic path with encoded spaces</a>
