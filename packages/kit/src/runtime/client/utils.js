/** @param {HTMLDocument} doc */
export function get_base_uri(doc) {
	let baseURI = doc.baseURI;

	if (!baseURI) {
		const baseTags = doc.getElementsByTagName('base');
		baseURI = baseTags.length ? baseTags[0].href : doc.URL;
	}

	return baseURI;
}

/** @param {Window} win */
export function unselect_all(win) {
	if (win.getSelection) {
		const selection = win.getSelection();
		if (selection) {
			selection.removeAllRanges();
		}
	}
}
