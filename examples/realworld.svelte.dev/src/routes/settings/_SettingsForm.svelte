<script>
	import { createEventDispatcher } from 'svelte';

	export let inProgress, image, username, bio, email, password = '';
	const dispatch = createEventDispatcher();

	function submit(event) {
		dispatch('save', { image, username, bio, email, password });
	}
</script>

<form on:submit|preventDefault='{submit}'>
	<fieldset>
		<fieldset class="form-group">
			<input class="form-control" type="text" placeholder="URL of profile picture" bind:value={image}>
		</fieldset>

		<fieldset class="form-group">
			<input class="form-control form-control-lg" type="text" placeholder="Username" bind:value={username}>
		</fieldset>

		<fieldset class="form-group">
			<textarea class="form-control form-control-lg" rows="8" placeholder="Short bio about you" bind:value={bio}/>
		</fieldset>

		<fieldset class="form-group">
			<input class="form-control form-control-lg" type="email" placeholder="Email" bind:value={email}>
		</fieldset>

		<fieldset class="form-group">
			<input class="form-control form-control-lg" type="password" placeholder="New Password" bind:value={password}>
		</fieldset>

		<button class="btn btn-lg btn-primary pull-xs-right" type="submit" disabled={inProgress}>
			Update Settings
		</button>
	</fieldset>
</form>