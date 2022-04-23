// https://amp.dev/documentation/guides-and-tutorials/learn/spec/amp-boilerplate/
const boilerplate = `
	<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
	<link rel="preload" as="script" href="https://cdn.ampproject.org/v0.js">
	<script async src="https://cdn.ampproject.org/v0.js"></script>`;

/*
TODO not sure what to do about this
if (options.service_worker) {
	head +=
		'<script async custom-element="amp-install-serviceworker" src="https://cdn.ampproject.org/v0/amp-install-serviceworker-0.1.js"></script>';

	body += `<amp-install-serviceworker src="${options.service_worker}" layout="nodisplay"></amp-install-serviceworker>`;
}
*/

/**
 * @param {string} html
 */
export function transform(html) {
	// TODO
	// * remove http-equiv
	// * <amp-install-serviceworker>
	// * probably lots of other stuff
	return html
		.replace(/<style([^]+?)<\/style>/, (match, $1) => `<style amp-custom${$1}</style>`)
		.replace(/<script[^]+?<\/script>/g, '')
		.replace('</head>', boilerplate + '</head>');
}
