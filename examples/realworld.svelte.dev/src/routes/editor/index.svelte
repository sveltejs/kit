<script context="module">
	export function load({ session }) {
		if (!session.user) {
			return { redirect: `/login`, status: 302 };
		}
	}
</script>

<script>
	import Editor from './_Editor.svelte';
	let article = { title: '', description: '', body: '', tagList: [] };
</script>

<Editor {article}/>