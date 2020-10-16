import fetch from 'node-fetch';

const render = (list, items) => `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
	<title>Svelte HN (${list})</title>
	<link>https://hn.svelte.dev/${list}/1</link>
	<description>Links from the orange site</description>
	<image>
		<url>https://hn.svelte.dev/favicon.png</url>
		<title>Svelte HN (${list})</title>
		<link>https://hn.svelte.dev/${list}/1</link>
	</image>
	${items.map(item => `
		<item>
			<title>${item.title}${item.domain ? ` (${item.domain})` : ''}</title>
			<link>https://hn.svelte.dev/item/${item.id}</link>
			<description><![CDATA[${
				item.url ? `<a href="${item.url}">link</a> / ` : ''
				}<a href="https://hn.svelte.dev/item/${item.id}">comments</a>
			]]></description>
			<pubDate>${new Date(item.time * 1000).toUTCString()}</pubDate>
		</item>
	`).join('\n')}
</channel>
</rss>`;

export function get(req, res) {
	const list = (
		req.params.list === 'top' ? 'news' :
		req.params.list === 'new' ? 'newest' :
		req.params.list
	);

	fetch(`https://api.hnpwa.com/v0/${list}/1.json`)
		.then(r => r.json())
		.then(items => {
			const feed = render(list, items);
			return {
				body: feed,
				headers: {
					'Cache-Control': `max-age=0, s-max-age=${600}`, // 10 minutes
					'Content-Type': 'application/rss+xml'
				}
			};
		});
}
