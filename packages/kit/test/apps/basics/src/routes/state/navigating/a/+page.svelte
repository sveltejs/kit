<script>
	import { goto } from '$app/navigation';
</script>

<p>a</p>
<button
	id="shallow-goto"
	onclick={() => goto('?shallow=1', { shallow: true, state: { shallow: 1 } })}
>
	shallow goto
</button>
