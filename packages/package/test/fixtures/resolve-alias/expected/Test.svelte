<script lang="ts">
	import { foo } from './sub/foo';
	import { util } from './utils';

	export let bar = foo;

	util();
</script>
