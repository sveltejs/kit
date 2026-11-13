<script>
	import { page } from '$app/state';
	import { match_route, match_routes } from './data.remote';

	const samples = [
		'/remote',
		'fork/relative',
		'/fork/test-slug?search=value#hash',
		'/remote/match/missing',
		'/remote/match/origin',
		`${page.url.origin}/fork/absolute`,
		new URL('/fork/url', page.url.origin)
	];

	const batched = [
		'/remote/match/origin',
		'https://string.example/remote/match/origin',
		new URL('https://url.example/remote/match/origin')
	].map((href) => match_routes(href));
</script>

{#each samples as href, i}
	<p data-id="match-{i}">{JSON.stringify(await match_route(href))}</p>
{/each}

{#each batched as result, i}
	<p data-id="batch-match-{i}">{JSON.stringify(await result)}</p>
{/each}
