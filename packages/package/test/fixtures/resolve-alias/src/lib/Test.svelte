<script lang="ts">
	import '$lib/css/global.css';

	import { foo } from '$lib/sub/foo';
	import { util } from '$utils';

	export let bar = foo;

	util();
</script>
