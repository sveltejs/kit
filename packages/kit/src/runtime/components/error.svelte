<script>
	import { page } from '$app/stores';
</script>

<h1>{$page.status}</h1>

<pre>{$page.error.message}</pre>

<!-- TODO figure out what to do with frames/stacktraces in prod -->
<!-- frame is populated by Svelte in its CompileError and is a Rollup/Vite convention -->
{#if $page.error.frame}
	<pre>{$page.error.frame}</pre>
{/if}
{#if $page.error.stack}
	<pre>{$page.error.stack}</pre>
{/if}
