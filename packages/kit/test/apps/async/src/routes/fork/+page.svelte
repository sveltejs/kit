<script>
	import { goto } from '$app/navigation';
</script>

<a href="/fork/1">Navigate to /1</a>

<button
	onclick={() => {
		goto('/fork?key=value', {
			replace: true
		});
	}}
>
	Go to /fork?key=value
</button>
