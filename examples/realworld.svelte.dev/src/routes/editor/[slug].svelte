<script context="module">
	import * as api from '$common/api.js';

	export async function preload({ params }, { user }) {
		if (!user) {
			this.redirect(302, `/login`);
		}

		const { slug } = params;
		const { article } = await api.get(`articles/${slug}`, null);
		return { article, slug };
	}
</script>

<script>
	import Editor from './_Editor.svelte';

	export let slug;
	export let article;
</script>

<Editor {article} {slug}/>