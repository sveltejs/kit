<script>
	import { integrity } from '$app/integrity';
	import bootstrapUrl from './bootstrap.js?url';

	const hash = integrity(bootstrapUrl);
</script>

<svelte:head>
	<script src={bootstrapUrl} type="module" integrity={hash} crossorigin="anonymous"></script>
</svelte:head>

<p id="url">{bootstrapUrl}</p>
<p id="hash">{hash ?? ''}</p>
