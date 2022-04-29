<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {URL | null} */
	let from;

	/** @type {URL} */
	let to;

	afterNavigate((navigation) => {
		from = navigation.from;
		to = navigation.to;
	});
</script>

<h1>{from?.pathname} -> {to?.pathname}</h1>
<a href="/after-navigate/a">/a</a>
