// https://amp.dev/documentation/guides-and-tutorials/learn/spec/amp-boilerplate/
const boilerplate = `
	<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
	<link rel="preload" as="script" href="https://cdn.ampproject.org/v0.js">
	<script async src="https://cdn.ampproject.org/v0.js"></script>
`;

/** @param {string} html */
export function transform(html) {
	return html
		.replace(/<style([^]+?)<\/style>/, (match, $1) => `<style amp-custom${$1}</style>`)
		.replace(/<script[^]+?<\/script>/g, '')
		.replace(/<link[^>]+>/g, (match) => {
			if (/rel=('|")?stylesheet\1/.test(match)) {
				if (/ disabled /.test(match)) return '';
				throw new Error(
					'An AMP document cannot contain <link rel="stylesheet"> — ensure that inlineStyleThreshold is set to Infinity, and remove links from your page template and <svelte:head> elements'
				);
			}

			return match;
		})
		.replace(/<meta[^>]+>/g, (match) => {
			if (match.includes('http-equiv')) return '';
			return match;
		})
		.replace('</head>', boilerplate + '</head>');
}
