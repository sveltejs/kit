<script context="module">
	import * as api from '$common/api.js';

	export async function preload({ params }, { user }) {
		const username = params.user.slice(1);

		const { profile } = await api.get(`profiles/${username}`, user && user.token);
		return { profile, favorites: params.view === 'favorites' };
	}
</script>

<script>
	import { session } from '$app/stores';
	import Profile from './_Profile.svelte';

	export let profile;
	export let favorites;
</script>

<svelte:head>
	<title>{profile.username} • Conduit</title>
</svelte:head>

<Profile {profile} {favorites} user={$session.user}/>