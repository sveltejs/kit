<script context="module">
	export async function load({ page, fetch }) {
		const [{ articles, pages }, { tags }] = await Promise.all([
			fetch(`/articles.json?${page.query}`, { credentials: 'include' }).then((r) => r.json()),
			fetch('/tags.json').then((r) => r.json())
		]);

		return {
			props: {
				articles,
				pages,
				tags
			}
		};
	}
</script>

<script>
	import { page, session } from '$app/stores';
	import ArticleList from '$components/ArticleList/index.svelte';
	import Pagination from '$components/Pagination.svelte';

	export let articles;
	export let pages;
	export let tags;

	$: p = +$page.query.get('p') || 1;
	$: tag = $page.query.get('tag');
	$: tab = $page.query.get('tab') || 'all';
	$: page_link_base = tag ? `tag=${tag}` : `tab=${tab}`;
</script>

<svelte:head>
	<title>Conduit</title>
</svelte:head>

<div class="home-page">
	{#if !$session.user}
		<div class="banner">
			<div class="container">
				<h1 class="logo-font">conduit</h1>
				<p>A place to share your knowledge.</p>
			</div>
		</div>
	{/if}

	<div class="container page">
		<div class="row">
			<div class="col-md-9">
				<div class="feed-toggle">
					<ul class="nav nav-pills outline-active">
						<li class="nav-item">
							<a
								href="/?tab=all"
								rel="prefetch"
								class="nav-link"
								class:active={tab === 'all' && !tag}
							>
								Global Feed
							</a>
						</li>

						{#if $session.user}
							<li class="nav-item">
								<a href="/?tab=feed" rel="prefetch" class="nav-link" class:active={tab === 'feed'}>
									Your Feed
								</a>
							</li>
						{:else}
							<li class="nav-item">
								<a href="/login" rel="prefetch" class="nav-link">Sign in to see your Feed </a>
							</li>
						{/if}

						{#if tag}
							<li class="nav-item">
								<a href="/?tag={tag}" rel="prefetch" class="nav-link active">
									<i class="ion-pound" />
									{tag}
								</a>
							</li>
						{/if}
					</ul>
				</div>

				<ArticleList {articles} />
				<Pagination {pages} {p} href={(p) => `/?${page_link_base}&page=${p}`} />
			</div>

			<div class="col-md-3">
				<div class="sidebar">
					<p>Popular Tags</p>
					<div className="tag-list">
						{#each tags as tag}
							<a href="/?tag={tag}" rel="prefetch" class="tag-default tag-pill"> {tag} </a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
