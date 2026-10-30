<script>
	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
</script>

<p id="current" class={['kit', { current: true }]}>{data.url.href}</p>
<p id="legacy-cookie">{data.legacy_cookie}</p>
<p id="legacy-devalue">{data.legacy_devalue}</p>
<p id="legacy-class" class={data.legacy_class}>app</p>
