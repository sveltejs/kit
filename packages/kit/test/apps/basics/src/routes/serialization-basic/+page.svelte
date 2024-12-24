<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>{data.foo.bar()}</h1>
<a href="/serialization-basic/child">child page</a>
