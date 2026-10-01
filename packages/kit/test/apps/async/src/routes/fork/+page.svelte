<script>
	import { goto } from '$app/navigation';
</script>

<a href="/fork/1">Navigate to /1</a>

<button
	onclick={() => {
		goto('/fork?key=value', {
			replaceState: true
		});
	}}
>
	Go to /fork?key=value
</button>
