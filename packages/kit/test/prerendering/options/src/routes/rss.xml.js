export async function get() {
  const body = `<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" media="screen" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog</title>
    <description>Description for blog</description>
    <link>https://website.com/</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <language>en-us</language>
    <copyright>Copyright 2022, Author</copyright>
    <generator>sveltekit</generator>
    <item>
      <title>Title</title>
      <link>https://website.com/first-blog</link>
      <guid isPermaLink="true">https://website.com/first-blog</guid>
      <atom:link href="https://website.com/first-blog" rel="self"></atom:link>
    </item>
  </channel>
</rss>`;
  const headers = {
    'cache-control': 'max-age=0, s-maxage=3600',
    'content-type': 'application/xml'
  };
  return {
    headers,
    body
  };
}
