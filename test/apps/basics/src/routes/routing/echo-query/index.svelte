<script>
	import { page } from '$app/stores';
</script>

<h1 class="echo-query">{JSON.stringify($page.query)}</h1>
