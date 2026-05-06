<script>
	import { get_count, set } from './form.remote';
</script>

<div id="count">Count: {await get_count()}</div>

<form {...set}>
	<button type="submit">Submit</button>
</form>
