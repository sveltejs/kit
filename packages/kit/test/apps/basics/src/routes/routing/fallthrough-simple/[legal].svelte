<script context="module">
	/** @type {import("@sveltejs/kit").Load} */
	export const load = ({ url }) => {
		if (url.pathname === '/valid') {
			return {
				props: {}
			};
		}
		return { fallthrough: true };
	};
</script>

<h1>Legal</h1>
