<script context="module">
	import * as api from '$common/api.js';

	export async function load({ page, session: { user } }) {
		const username = page.params.user.slice(1); // TODO is the @ necessary?

		// TODO create an endpoint for this
		const { profile } = await api.get(`profiles/${username}`);

		return {
			props: { profile }
		};
	}
</script>

<script>
	import { goto } from '$app/navigation';
	import { page, session } from '$app/stores';

	export let profile;

	$: segments = $page.path.split('/');
	$: is_favorites = segments.length === 4 && segments[3] === 'favorites';
	$: is_user = $session.user && profile.username === $session.user.username;

	async function toggle_following() {
		if (!user) return goto('/login');

		// optimistic UI
		profile.following = !profile.following;

		({ profile } = await (profile.following
			? api.post(`profiles/${profile.username}/follow`, null, session.user && session.user.token)
			: api.del(`profiles/${profile.username}/follow`, session.user && session.user.token)));
	}
</script>

<svelte:head>
	<title>{profile.username} • Conduit</title>
</svelte:head>

<div class="profile-page">
	<div class="user-info">
		<div class="container">
			<div class="row">
				<div class="col-xs-12 col-md-10 offset-md-1">
					<img src={profile.image} class="user-img" alt={profile.username} />
					<h4>{profile.username}</h4>
					<p>{profile.bio}</p>

					{#if is_user}
						<a href="/settings" class="btn btn-sm btn-outline-secondary action-btn">
							<i class="ion-gear-a" />
							Edit Profile Settings
						</a>
					{:else}
						<button
							class="btn btn-sm action-btn {profile.following ? 'btn-secondary' : 'btn-outline-secondary'}"
							on:click={toggle_following}>
							<i class="ion-plus-round" />
							{profile.following ? 'Unfollow' : 'Follow'}
							{profile.username}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="container">
		<div class="row">
			<div class="col-xs-12 col-md-10 offset-md-1">
				<div class="articles-toggle">
					<ul class="nav nav-pills outline-active">
						<li class="nav-item">
							<a
								href="/profile/@{profile.username}"
								class="nav-link"
								rel="prefetch"
								class:active={!is_favorites}>My Articles</a>
						</li>

						<li class="nav-item">
							<a
								href="/profile/@{profile.username}/favorites"
								class="nav-link"
								rel="prefetch"
								class:active={is_favorites}>Favorited Articles</a>
						</li>
					</ul>
				</div>

				<slot />
			</div>
		</div>
	</div>
</div>
