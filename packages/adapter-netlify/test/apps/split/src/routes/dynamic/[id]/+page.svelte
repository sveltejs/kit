<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<!-- Netlify uses URLPattern for routing and we want to test that our dynamic param configuration works with it -->
<p>id: {data.id}</p>
