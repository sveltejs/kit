<script>
	let { data } = $props();
</script>

<!-- Netlify uses URLPattern for routing; verify direct SSR works whether the optional param is present or omitted -->
<p>optional: {data.optional ?? 'none'}</p>
