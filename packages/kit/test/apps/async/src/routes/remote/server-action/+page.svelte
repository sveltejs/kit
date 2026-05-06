<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<p id="result">{form?.result ?? ''}</p>

<form method="POST" use:enhance>
	<input type="hidden" name="input" value="hello" />
	<button>submit</button>
</form>
