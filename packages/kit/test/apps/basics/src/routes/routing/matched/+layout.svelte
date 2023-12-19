<script lang="ts">
	import { resolveRoute } from '$app/paths';
</script>

<!-- <a href="/routing/matched"> 🤞 matched </a> -->
<!-- <a href={resolveRoute('/rooting/matched')}> ❌ matched </a> -->
<a href={resolveRoute('/routing/matched')}> ✅ matched </a>

<!-- <a href="/routing/matched/a"> 🤞 lowercase </a> -->
<!-- <a href={resolveRoute('/routing/matched/[letter=lowercase]', { letter: true })}> ❌ lowercase </a> -->
<a href={resolveRoute('/routing/matched/[letter=lowercase]', { letter: 'a' })}> ✅ lowercase </a>

<!-- <a href="/routing/matched/B">/routing/matched/B</a> -->
<a href={resolveRoute('/routing/matched/[letter=uppercase]', { letter: 'B' })}>uppercase</a>
<!-- <a href="/routing/matched/1">/routing/matched/1</a> -->
<a href={resolveRoute('/routing/matched/[number=numeric]', { number: '1' })}> numeric </a>
<!-- <a href="/routing/matched/everything-else">/routing/matched/everything-else</a> -->
<a href={resolveRoute('/routing/matched/[fallback]', { fallback: 'everything-else' })}>
	fallback
</a>
<a href={resolveRoute('/routing/matched/[[optional]]/withOption', { optional: 'sziaaa' })}>
	optional
</a>

<slot />
