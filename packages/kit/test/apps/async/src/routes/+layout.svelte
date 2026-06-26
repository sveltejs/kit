<script lang="ts">
	import { setup } from '../../../../setup.js';

	const { children } = $props();

	setup();
</script>

{@render children?.()}
