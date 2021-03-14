<script>
	import { createEventDispatcher } from 'svelte';
	import * as api from '$lib/api.js';

	export let comment;
	export let slug;
	export let user;

	const dispatch = createEventDispatcher();

	async function remove() {
		await api.del(`articles/${slug}/comments/${comment.id}`, user && user.token);
		dispatch("deleted");
	}
</script>

<div class="card">
	<div class="card-block">
		<p class="card-text">{comment.body}</p>
	</div>

	<div class="card-footer">
		<a href='/profile/@{comment.author.username}' class="comment-author">
			<img src={comment.author.image} class="comment-author-img" alt={comment.author.username} />
		</a>

		<a href='/profile/@{comment.author.username}' class="comment-author">{comment.author.username}</a>

		<span class="date-posted">
			{new Date(comment.createdAt).toDateString()}
		</span>

		{#if user && comment.author.username === user.username}
			<span class="mod-options">
				<i class="ion-trash-a" on:click='{remove}'></i>
			</span>
		{/if}
	</div>
</div>