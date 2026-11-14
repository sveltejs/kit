<script>
	import { get_foo } from '../platform.remote.js';

	let foo = $state('');
</script>

<button onclick={async () => (foo = await get_foo())}>{foo}</button>
