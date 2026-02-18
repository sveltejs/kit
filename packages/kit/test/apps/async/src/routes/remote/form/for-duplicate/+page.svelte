<script>
	import { get_count, increment } from './form.remote.ts';
	const count = get_count();
</script>

<p id="count">{count.current}</p>

<!-- this looks weird but forces the spread into being reactive -->
<form {...increment.for((count.current || 1) && 'a').enhance(async ({ submit }) => await submit())}>
	<button type="submit" id="submit">Submit</button>
</form>
