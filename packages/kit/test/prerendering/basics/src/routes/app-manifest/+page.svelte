<script>
	// importing `prerendered` means the client bundle is rewritten after prerendering
	import { prerendered } from '$app/manifest';
</script>

<pre>{JSON.stringify(prerendered)}</pre>
