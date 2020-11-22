<script>
	import { getStores } from '/_app/main/runtime/stores';
	import ArticlePreview from './ArticlePreview.svelte';
	import ListPagination from './ListPagination.svelte';
	import * as api from '$common/api.js';

	export let tab, username = false;
	export let favorites = false;
	export let tag;
	export let p;

	const { session, page } = getStores();

	let query;
	let articles;
	let articlesCount;

	$: {
		const endpoint = tab === 'feed' ? 'articles/feed' : 'articles';
		const page_size = tab === 'feed' ? 5 : 10;

		let params = `limit=${page_size}&offset=${(p - 1) * page_size}`;
		if (tab === 'tag') params += `&tag=${tag}`;
		if (tab === 'profile') params += `&${favorites ? 'favorited' : 'author'}=${encodeURIComponent(username)}`;

		query = `${endpoint}?${params}`;
	}

	$: query && getData();

	async function getData() {
		articles = null;

		// TODO do we need some error handling here?
		({ articles, articlesCount } = await api.get(query, $session.user && $session.user.token));
	}
</script>

{#if articles}
	{#if articles.length === 0}
		<div class="article-preview">
			No articles are here... yet.
		</div>
	{:else}
		<div>
			{#each articles as article (article.slug)}
				<ArticlePreview {article} user={$session.user}/>
			{/each}

			<ListPagination {articlesCount} page={parseInt($page.params.user, 10)}  />
		</div>
	{/if}
{:else}
	<div class="article-preview">Loading...</div>
{/if}