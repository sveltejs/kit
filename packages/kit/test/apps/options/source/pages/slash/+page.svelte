<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<h2>{page.url.pathname}</h2>

<a data-testid="child" href={resolve('/slash/child')}>/slash/child</a>
