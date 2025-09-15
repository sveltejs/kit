<script>
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';

	let type = '...';

	afterNavigate((navigation) => {
		type = /** @type {string} */ (navigation.type);
	});
</script>

<h1>{page.url.searchParams.get('q') ?? '...'}</h1>
<h2>{type}</h2>
<h3>{page.url.searchParams.get('foo') ?? '...'}</h3>

<form>
	<input name="q" />
	<button type="submit" name="foo" value="bar">Submit</button>
</form>
