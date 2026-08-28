<script>
	import image from './favicon.png?no-inline';
	import worker_url from './worker.js?worker&url';
</script>

<img src={image} alt="svelte logo" />

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a href="/asset.json">includes public assets</a>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a data-testid="worker" href={worker_url}>includes worker files</a>
