<script>
    import { browser } from "$app/environment";
    
    import JSIndicator from "../../../components/JSIndicator.svelte";
    import LegacyIndicator from "../../../components/LegacyIndicator.svelte";

    if (browser) {
        // @ts-ignore
        window.__startedFromRootPage = true;
    }
</script>

<svelte:head>
    <title>SvelteKit Legacy Basic</title>
</svelte:head>

<h1>SvelteKit Legacy Basic</h1>

<JSIndicator />

<LegacyIndicator />

<p><a data-sveltekit-prefetch href="/test-page">Test Page</a></p>
