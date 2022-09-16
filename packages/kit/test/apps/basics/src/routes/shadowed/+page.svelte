<a href="/shadowed/simple">simple</a>
<a href="/shadowed/redirect-get">redirect-get</a>
<a href="/shadowed/redirect-get-with-cookie">redirect-get-with-cookie</a>
<a href="/shadowed/redirect-get-with-cookie-from-fetch">redirect-get-with-cookie-from-fetch</a>
<a href="/shadowed/error-get">error-get</a>
<a href="/shadowed/no-get">no-get</a>
<a href="/shadowed/dynamic/foo">dynamic/foo</a>
<a href="/shadowed/missing-get">missing-get</a>
<a href="/shadowed/serialization">serialization</a>

<form action="/shadowed/redirect-post" method="post">
	<button type="submit" id="redirect-post">redirect</button>
</form>

<form action="/shadowed/redirect-post-with-cookie" method="post">
	<button type="submit" id="redirect-post-with-cookie">redirect</button>
</form>

<form action="/shadowed/error-post" method="post" enctype="multipart/form-data">
	<input name="message" value="posted data" />
	<button type="submit" id="error-post">error</button>
</form>
