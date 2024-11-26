<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {import('@sveltejs/kit').NavigationTarget | null} */
	let from;

	/** @type {import('@sveltejs/kit').NavigationTarget} */
	let to;

	afterNavigate((navigation) => {
		from = navigation.from;
		to = navigation.to;
	});
</script>

<h1>{`${from?.url.pathname} -> ${to?.url.pathname}`}</h1>
<a href="/navigation-lifecycle/after-navigate/b">/b</a>
