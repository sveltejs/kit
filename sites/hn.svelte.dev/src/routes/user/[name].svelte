<script context="module">
	export const hydrate = false;

	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch }) {
		const res = await fetch(`https://api.hnpwa.com/v0/user/${params.name}.json`);
		const user = await res.json();

		return {
			props: {
				name: params.name,
				user
			}
		};
	}
</script>

<script>
	const d = new Date();

	export let name;
	export let user;
</script>

<svelte:head>
	<title>{name} • Svelte Hacker News</title>
</svelte:head>

<h1>{name}</h1>

<div>
	<p>...joined <strong>{user.created}</strong>, and has <strong>{user.karma}</strong> karma</p>

	<p>
		<a href="https://news.ycombinator.com/submitted?id={user.id}">submissions</a> /
		<a href="https://news.ycombinator.com/threads?id={user.id}">comments</a> /
		<a href="https://news.ycombinator.com/favorites?id={user.id}">favourites</a>
	</p>

	{#if user.about}
		<div class="about">
			{@html '<p>' + user.about}
		</div>
	{/if}
</div>
