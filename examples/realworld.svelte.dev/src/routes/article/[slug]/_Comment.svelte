<script>
	import { createEventDispatcher } from 'svelte';
	import { ajax } from '$lib/actions.js';

	export let comment;
	export let slug;
	export let user;

	const dispatch = createEventDispatcher();
	const onresponse = (res) => {
		if (res.ok) {
			// check the comment was deleted (e.g. we didn't
			// double-click and submit twice)
			dispatch('deleted');
		}
	};
</script>

<div class="card">
	<div class="card-block">
		<p class="card-text">{comment.body}</p>
	</div>

	<div class="card-footer">
		<a href="/profile/@{comment.author.username}" class="comment-author">
			<img src={comment.author.image} class="comment-author-img" alt={comment.author.username} />
		</a>

		<a
			href="/profile/@{comment.author.username}"
			class="comment-author"
		>{comment.author.username}</a>

		<span class="date-posted"> {new Date(comment.createdAt).toDateString()} </span>

		{#if user && comment.author.username === user.username}
			<form
				action="/article/{slug}/comments/{comment.id}.json?_method=delete"
				method="post"
				class="mod-options"
				use:ajax={{ onresponse }}
			>
				<button class="ion-trash-a" />
			</form>
		{/if}
	</div>
</div>

<style>
	button {
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		font-size: inherit;
		margin-left: 5px;
		opacity: 0.6;
		cursor: pointer;
	}
</style>
