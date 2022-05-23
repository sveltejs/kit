<script>
	import { afterNavigate, disableScrollHandling } from '$app/navigation';

	afterNavigate(() => {
		disableScrollHandling();
		document.getElementById('abcde')?.scrollIntoView();
	});
</script>

<div style="height: 180vh; background-color: hotpink;">They (don't) see me...</div>
<div style="height: 180vh; background-color: peru;">
	<p id="go-to-element">The browser scrolls to me</p>
</div>
<p id="abcde" style="height: 180vh; background-color: hotpink;">I take precedence</p>
<div />

<a href="/anchor-with-manual-scroll/anchor-afternavigate?x=y#go-to-element">reload me</a>