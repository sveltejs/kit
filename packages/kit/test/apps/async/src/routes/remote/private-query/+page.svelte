<script>
	import { reveal } from './data.remote.js';
</script>

<button onclick={async () => console.log(await reveal())}>reveal</button>
