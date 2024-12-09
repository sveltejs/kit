<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const foo = data.foo;

	console.log(foo.lol());
</script>
