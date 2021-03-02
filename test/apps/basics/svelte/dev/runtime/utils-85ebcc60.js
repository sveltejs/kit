function find_anchor(node) {
	while (node && node.nodeName.toUpperCase() !== 'A') node = node.parentNode; // SVG <a> elements have a lowercase name
	return node;
}

function get_base_uri(window_document) {
	let baseURI = window_document.baseURI;

	if (!baseURI) {
		const baseTags = window_document.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : window_document.URL;
	}

	return baseURI;
}

export { find_anchor as f, get_base_uri as g };
//# sourceMappingURL=utils-85ebcc60.js.map
