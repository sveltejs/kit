<script lang="ts">
	import type { PageData } from './$types'

	export let data: PageData
</script>

<section>
	<h2>{data.userAgentText}</h2>
</section>