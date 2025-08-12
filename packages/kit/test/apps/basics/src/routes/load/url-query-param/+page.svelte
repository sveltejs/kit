<script>
	import { page } from '$app/state';
</script>

<h1>Hello {page.data.currentClientState ?? ''}</h1>

<p>{page.data.textFromTheServer}</p>

<a href="/load/url-query-param?currentClientState=ABC">ABC</a>
<a href="/load/url-query-param?currentClientState=DEF">DEF</a>
<hr />
<a href="/load/url-query-param" data-sveltekit-reload>Reload site</a>
