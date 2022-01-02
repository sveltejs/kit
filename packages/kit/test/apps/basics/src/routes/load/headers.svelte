<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch }) {
		return { headers: { potato: 'potahto' } };
	}
</script>

<div>
  Never gonna give you up
</div>