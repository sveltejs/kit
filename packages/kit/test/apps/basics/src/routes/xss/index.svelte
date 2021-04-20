<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ fetch }) {
		const res = await fetch('/xss.json');
		const user = await res.json();

		return {
			props: { user }
		}
	}
</script>

<script>
	/** @type {{ name: string }} */
	export let user;
</script>

<h1>user.name is {user.name}</h1>