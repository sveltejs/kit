<script>
	import { asset, resolve } from '$app/paths';

	// A literal filename may start with a scheme even though a URL cannot.
	// @ts-expect-error this filename is not in the static directory
	const resolved_asset = asset('icon:example.svg');

	const inputs = [
		'https://example.com/x',
		'https:',
		'mailto:hello@example.com',
		'custom+scheme.1-test:value',
		'HTTPS://example.com/x',
		'//example.com/x',
		'///example.com/x'
	];

	const results = inputs.map((input) => {
		try {
			// @ts-expect-error external URLs are not valid paths
			return resolve(input);
		} catch (error) {
			return /** @type {Error} */ (error).message;
		}
	});
</script>

{#each inputs as input, i}
	<p data-testid={input}>{results[i]}</p>
{/each}

<p data-testid="path">{resolve('base/?next=https://example.com/x#//anchor')}</p>
<p data-testid="route">{resolve('/base/[slug]', { slug: 'https:example.com' })}</p>
<p data-testid="empty">{resolve('')}</p>
<p data-testid="asset">{resolved_asset}</p>
