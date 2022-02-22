/** @param {HTMLDocument} doc */
export function get_base_uri(doc) {
	let baseURI = doc.baseURI;

	if (!baseURI) {
		const baseTags = doc.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : doc.URL;
	}

	return baseURI;
}

/**
 * @param {Event} event
 * @returns {HTMLAnchorElement | SVGAElement | undefined}
 */
export function find_anchor(event) {
	const node = event
		.composedPath()
		.find((e) => e instanceof Node && e.nodeName.toUpperCase() === 'A'); // SVG <a> elements have a lowercase name
	return /** @type {HTMLAnchorElement | SVGAElement | undefined} */ (node);
}

/**
 * @param {HTMLAnchorElement | SVGAElement} node
 * @returns {URL}
 */
export function get_href(node) {
	return node instanceof SVGAElement
		? new URL(node.href.baseVal, document.baseURI)
		: new URL(node.href);
}
