<script>
import { global_counter } from '$lib/global_store';

global_counter.subscribe(count => console.log("counter updated", count));

</script>
<h1>{$global_counter}</h1>

<button on:click={() => global_counter.set(1)}>set</button>
<button on:click={() => global_counter.update((count) => count + 1)}>update</button>