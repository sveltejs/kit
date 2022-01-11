const DOCTYPE_OPEN = '<!DOCTYPE';
const CDATA_OPEN = '<![CDATA[';
const CDATA_CLOSE = ']]>';
const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';

const TAG_OPEN = /[a-zA-Z]/;
const TAG_CHAR = /[a-zA-Z0-9]/;

const ATTRIBUTE_OPEN = TAG_OPEN;
const ATTRIBUTE_CHAR = TAG_CHAR;

const EXTERNAL = /\bexternal\b/;

const WHITESPACE = /[\s\n\r]/;

/** @param {string} html */
export function crawl(html) {
	/** @type {string[]} */
	const hrefs = [];

	let i = 0;
	main: while (i < html.length) {
		const char = html[i];

		if (char === '<') {
			if (html.slice(i, DOCTYPE_OPEN.length).toUpperCase() === DOCTYPE_OPEN) {
				i += DOCTYPE_OPEN.length;
				while (i < html.length) {
					if (html[i++] === '>') {
						continue main;
					}
				}
			}

			// skip cdata
			if (html.slice(i, CDATA_OPEN.length) === CDATA_OPEN) {
				i += CDATA_OPEN.length;
				while (i < html.length) {
					if (html.slice(i, CDATA_CLOSE.length) === CDATA_CLOSE) {
						i += CDATA_CLOSE.length;
						continue main;
					}

					i += 1;
				}
			}

			// skip comments
			if (html.slice(i, COMMENT_OPEN.length) === COMMENT_OPEN) {
				i += COMMENT_OPEN.length;
				while (i < html.length) {
					if (html.slice(i, COMMENT_CLOSE.length) === COMMENT_CLOSE) {
						i += COMMENT_CLOSE.length;
						continue main;
					}

					i += 1;
				}
			}

			// parse opening tags
			const start = ++i;
			if (TAG_OPEN.test(html[start])) {
				let tag;

				while (i < html.length) {
					if (!TAG_CHAR.test(html[i])) {
						break;
					}

					i += 1;
				}

				tag = html.slice(start, i).toUpperCase();

				if (tag === 'SCRIPT' || tag === 'STYLE') {
					const close = '</' + tag;
					while (i < html.length) {
						if (html.slice(i, i + close.length).toUpperCase() === close) {
							continue main;
						}

						i += 1;
					}
				}

				/** @type {Record<string, string>} */
				const attributes = {};

				attr: while (i < html.length) {
					const start = i;

					const char = html[start];
					if (char === '>') break;

					if (ATTRIBUTE_OPEN.test(char)) {
						i += 1;
						let name;

						while (i < html.length) {
							if (!ATTRIBUTE_CHAR.test(html[i])) {
								break;
							}

							i += 1;
						}

						name = html.slice(start, i);

						while (WHITESPACE.test(html[i])) i += 1;

						if (html[i] === '=') {
							i += 1;
							while (WHITESPACE.test(html[i])) i += 1;

							if (html[i] === "'" || html[i] === '"') {
								const quote = html[i++];

								const start = i;
								if (quote) {
									let escaped = false;

									while (i < html.length) {
										if (!escaped) {
											const char = html[i];

											if (html[i] === quote) {
												break;
											}

											if (char === '\\') {
												escaped = true;
											}
										}

										i += 1;
									}
								} else {
									while (!WHITESPACE.test(html[i])) i += 1;
								}

								const value = html.slice(start, i);

								attributes[name.toLowerCase()] = value;
							}
						}
					}

					i += 1;
				}

				if (attributes.href) {
					if (!EXTERNAL.test(attributes.rel)) {
						hrefs.push(attributes.href);
					}
				}

				if (attributes.src) {
					hrefs.push(attributes.src);
				}

				if (attributes.srcset) {
					const candidates = attributes.srcset.split(',');
					for (const candidate of candidates) {
						const src = candidate.trim().split(WHITESPACE)[0];
						hrefs.push(src);
					}
				}
			}
		}

		i += 1;
	}

	return hrefs;
}
