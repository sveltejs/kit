<script>
	import { enhance } from '$app/forms';
</script>

<form method="POST" action="/actions/enhance-non-action-response/reject" use:enhance>
	<button class="json">Submit</button>
</form>

<form method="POST" action="/actions/enhance-non-action-response/reject?body=html" use:enhance>
	<button class="html">Submit</button>
</form>

<form method="POST" action="/actions/enhance-non-action-response/reject?body=empty" use:enhance>
	<button class="empty">Submit</button>
</form>
