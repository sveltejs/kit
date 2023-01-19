<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>content-type: {data.headers.get('content-type')}</h1>
