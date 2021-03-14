<script>
	import { createEventDispatcher } from 'svelte';
	import * as api from '$lib/api.js';

	export let slug;
	export let user;

	const dispatch = createEventDispatcher();

	let body = '';

	async function submit(event) {
		const response = await api.post(`articles/${slug}/comments`, { comment: { body } }, user && user.token);

		if (response.comment) {
			dispatch('commented', response);
			body = '';
		}
	}
</script>

<form class="card comment-form" on:submit|preventDefault='{submit}'>
	<div class="card-block">
		<textarea class="form-control" placeholder="Write a comment..." bind:value={body} rows="3"/>
	</div>

	<div class="card-footer">
		<img src={user.image} class="comment-author-img" alt={user.username} >
		<button class="btn btn-sm btn-primary" type="submit">Post Comment</button>
	</div>
</form>