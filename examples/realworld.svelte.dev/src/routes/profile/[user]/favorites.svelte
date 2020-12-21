<script context="module">
	import { create_load } from './_load.js';
	export const load = create_load('favorited');
</script>

<script>
	import ArticleList from '$components/ArticleList/index.svelte';

	export let articles;
	export let articlesCount;
</script>

<ArticleList {articles} {articlesCount} />
