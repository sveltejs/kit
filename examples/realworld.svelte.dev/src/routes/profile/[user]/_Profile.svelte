<script>
	import { goto } from '/_app/main/runtime/navigation';
	import ArticleList from '$components/ArticleList/index.svelte';
	import * as api from '$common/api.js';

	export let profile;
	export let favorites;
	export let user;

	$: isUser = user && (profile.username === user.username);

	async function toggleFollowing() {
		if (!user) return goto('/login');

		// optimistic UI
		profile.following = !profile.following;

		({ profile, favorites } = await (profile.following
			? api.post(`profiles/${profile.username}/follow`, null, user && user.token)
			: api.del(`profiles/${profile.username}/follow`, user && user.token)));
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

					{#if isUser}
						<a href="/settings" class="btn btn-sm btn-outline-secondary action-btn">
							<i class="ion-gear-a"></i> Edit Profile Settings
						</a>
					{:else}
						<button
							class='btn btn-sm action-btn {profile.following ? "btn-secondary" : "btn-outline-secondary"}'
							on:click='{toggleFollowing}'
						>
							<i class="ion-plus-round"></i>
							{profile.following ? 'Unfollow' : 'Follow'} {profile.username}
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
							<a href='/profile/@{profile.username}' class="nav-link {favorites ? '' : 'active'}">My Articles</a>
						</li>

						<li class="nav-item">
							<a class="nav-link {favorites ? 'active' : ''}" href='/profile/@{profile.username}/favorites'>Favorited Articles</a>
						</li>
					</ul>
				</div>

				<ArticleList tab='profile' username='{profile.username}' {favorites}/>
			</div>
		</div>
	</div>
</div>