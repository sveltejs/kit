export function get_base_uri(window_document) {
	let baseURI = window_document.baseURI;

	if (!baseURI) {
		const baseTags = window_document.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : window_document.URL;
	}

	return baseURI;
}
