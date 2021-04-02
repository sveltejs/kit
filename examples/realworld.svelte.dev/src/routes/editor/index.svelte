<script context="module">
	export function load({ session }) {
		if (!session.user) {
			return {
				status: 302,
				redirect: `/login`
			};
		}

		return {};
	}
</script>

<script>
	import Editor from './_Editor.svelte';
	let article = { title: '', description: '', body: '', tagList: [] };
</script>

<Editor {article}/>