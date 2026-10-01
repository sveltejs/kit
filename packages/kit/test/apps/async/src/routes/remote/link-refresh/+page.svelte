<script>
	import { increment, get_count, reset } from './data.remote.js';
</script>

<button id="reset" onclick={() => reset()}>reset</button>
<button id="increment" onclick={() => increment()}>increment</button>

<a id="count" href="/remote/link-refresh">{await get_count()}</a>
