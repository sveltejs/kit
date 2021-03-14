<script context="module">
	import * as api from '$lib/api.js';

	export async function load({ page, session }) {
		if (!session.user) {
			return { redirect: `/login`, status: 302 };
		}

		const { slug } = page.params;
		const { article } = await api.get(`articles/${slug}`, null);
		return {
			props: { article, slug }
		};
	}
</script>

<script>
	import Editor from './_Editor.svelte';

	export let slug;
	export let article;
</script>

<Editor {article} {slug}/>