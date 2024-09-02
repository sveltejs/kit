<script>
	import { page } from '$app/stores'
</script>

<h1>{$page.params.page}</h1>
<ul>
	<li><a href='apple'>Apple</a></li>
	<li><a href='orange'>Orange</a></li>
	<li><a href='pear'>Pear (not permitted)</a></li>
</ul>

<style>
	h1 {
		text-transform: capitalize;
	}
</style>