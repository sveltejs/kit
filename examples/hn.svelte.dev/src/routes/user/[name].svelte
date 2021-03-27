<script context="module">
	export const hydrate = false;

	export async function load({ page, fetch }) {
		const res = await fetch(`https://api.hnpwa.com/v0/user/${page.params.name}.json`);
		const user = await res.json();

		return {
			props: {
				name: page.params.name,
				user
			}
		};
	}
</script>

<script>
	const d = new Date();
	const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());

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
			{@html '<p>' + user.about }
		</div>
	{/if}
</div>