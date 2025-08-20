<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>bar == {data.foo}?</h1>

<a href="/load/fetch-request">fetch request</a>
<a href="/load/fetch-relative">fetch relative</a>
<a href="/load/fetch-credentialed">fetch credentialed</a>
<a href="/load/fetch-request-headers">fetch headers</a>
<a href="/load/fetch-no-body">fetch no body</a>
<a href="/load/large-response">large response</a>
<a href="/load/raw-body">raw body</a>
<a href="/load/server-fetch-request">server fetch request</a>
