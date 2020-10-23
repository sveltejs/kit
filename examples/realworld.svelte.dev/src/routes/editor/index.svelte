<script context="module">
	export function preload({ params }, { user }) {
		if (!user) {
			this.redirect(302, `/login`);
		}
	}
</script>

<script>
	import Editor from './_Editor.svelte';
	let article = { title: '', description: '', body: '', tagList: [] };
</script>

<Editor {article}/>