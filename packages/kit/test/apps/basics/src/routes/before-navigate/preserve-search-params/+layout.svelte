<script>
	import { beforeNavigate } from '$app/navigation';

    // do not change, used in test (/basics/test/cross-platform/client.test.js):
    const preserved_param = 'preserved';

	beforeNavigate(({ from, to }) => {
		const previous_param_value = from?.url.searchParams.get(preserved_param);
        if (typeof previous_param_value === 'string') {
            to?.url.searchParams.set(preserved_param, previous_param_value);
        }
	});
</script>

<div data-sveltekit-preload-data="hover">
    <h1>preserve search params</h1>
    <a href="/before-navigate/preserve-search-params">main page</a>
    <a href="/before-navigate/preserve-search-params/another-page">another page</a>
    <a href="/before-navigate/preserve-search-params/yet-another-page">yet another page</a>
    <slot />
</div>
