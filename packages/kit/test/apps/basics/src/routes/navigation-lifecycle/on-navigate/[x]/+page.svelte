<script>
	import { onNavigate } from '$app/navigation';

	/** @type {import('@sveltejs/kit').NavigationTarget} */
	let from;

	/** @type {import('@sveltejs/kit').NavigationTarget} */
	let to;

	/** @type {Omit<import('@sveltejs/kit').NavigationType, 'enter' | 'leave'>} */
	let type;

	onNavigate((navigation) => {
		from = navigation.from;
		to = navigation.to;
		type = navigation.type;
	});
</script>

<h1>{from?.url.pathname} -> {to?.url.pathname} ({type ?? '...'})</h1>
<a href="/navigation-lifecycle/on-navigate/b">/b</a>
