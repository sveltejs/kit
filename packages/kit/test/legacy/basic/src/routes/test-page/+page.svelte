<script>
    import { browser } from "$app/environment";

    import JSIndicator from "../../../../components/JSIndicator.svelte";
    import LegacyIndicator from "../../../../components/LegacyIndicator.svelte";
    import TestButton from "../../../../components/TestButton.svelte";

    // @ts-ignore
    const isStartedFromRootPage = browser && !!window.__startedFromRootPage;
</script>

<svelte:head>
    <title>SvelteKit Legacy Basic Test Page</title>
</svelte:head>

<h1>SvelteKit Legacy Basic Test</h1>

<JSIndicator />

<LegacyIndicator />

<p><TestButton /></p>

<p>
    Started from root page: <span id="root-starting-indicator">{isStartedFromRootPage}</span>
</p>