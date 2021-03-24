<script>
	import { createEventDispatcher } from 'svelte';
	import { placeholder } from '$lib/constants.js';
	import { ajax } from '$lib/actions.js';

	export let slug;
	export let user;

	const dispatch = createEventDispatcher();

	let body = '';
	let submitting = false;

	const onsubmit = () => {
		submitting = true;
	};

	const onresponse = async (res) => {
		if (res.ok) {
			const comment = await res.json();
			dispatch('commented', { comment });
			body = '';
		} else {
			// TODO error handling
		}

		submitting = false;
	};
</script>

<form
	action="/article/{slug}/comments.json"
	method="post"
	class="card comment-form"
	use:ajax={{ onsubmit, onresponse }}
>
	<div class="card-block">
		<textarea
			disabled={submitting}
			class="form-control"
			name="comment"
			placeholder="Write a comment..."
			bind:value={body}
			rows="3"
		/>
	</div>

	<div class="card-footer">
		<img src={user.image || placeholder} class="comment-author-img" alt={user.username} />
		<button disabled={submitting} class="btn btn-sm btn-primary" type="submit">Post Comment</button>
	</div>
</form>
