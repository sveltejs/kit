<script context="module">
	export async function load({ page, fetch }) {
		const { slug } = page.params;
		const [article, comments] = await Promise.all([
			fetch(`/article/${slug}.json`).then((r) => r.json()),
			fetch(`/article/${slug}/comments.json`).then((r) => r.json())
		]);

		return {
			props: { article, comments, slug }
		};
	}
</script>

<script>
	import { session } from '$app/stores';
	import marked from 'marked';

	import ArticleMeta from './_ArticleMeta.svelte';
	import CommentContainer from './_CommentContainer.svelte';

	export let article;
	export let comments;
	export let slug;

	$: markup = marked(article.body);
</script>

<svelte:head>
	<title>{article.title}</title>
</svelte:head>

<div class="article-page">
	<div class="banner">
		<div class="container">
			<h1>{article.title}</h1>
			<ArticleMeta {article} user={$session.user} />
		</div>
	</div>

	<div class="container page">
		<div class="row article-content">
			<div class="col-xs-12">
				<div>
					{@html markup}
				</div>

				<ul class="tag-list">
					{#each article.tagList as tag}
						<li class="tag-default tag-pill tag-outline">{tag}</li>
					{/each}
				</ul>
			</div>
		</div>

		<hr />

		<div class="article-actions" />

		<div class="row">
			<CommentContainer {slug} {comments} user={$session.user} errors={[]} />
		</div>
	</div>
</div>
