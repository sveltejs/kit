<script>
	import { goto } from '$app/navigation';
	import * as api from '$lib/api.js';

	export let article;
	export let user;

	$: can_modify = user && article.author.username === user.username;

	async function remove() {
		await api.del(`articles/${article.slug}`, user && user.token);
		goto('/');
	}
</script>

<div class="article-meta">
	<a href='/profile/@{article.author.username}'>
		<img src={article.author.image} alt={article.author.username} />
	</a>

	<div class="info">
		<a href='/profile/@{article.author.username}' class="author"> {article.author.username}</a>
		<span class="date">
			{new Date(article.createdAt).toDateString()}
		</span>
	</div>

	{#if can_modify}
		<span>
			<a href='/editor/{article.slug}' class="btn btn-outline-secondary btn-sm">
				<i class="ion-edit"/> Edit Article
			</a>

			<button class="btn btn-outline-danger btn-sm" on:click='{remove}'>
				<i class="ion-trash-a"/> Delete Article
			</button>
		</span>
	{/if}
</div>
