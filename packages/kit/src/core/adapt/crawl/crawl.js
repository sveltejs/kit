const DOCTYPE = 'DOCTYPE';
const CDATA_OPEN = '[CDATA[';
const CDATA_CLOSE = ']]>';
const COMMENT_OPEN = '--';
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
			if (html[i + 1] === '!') {
				i += 2;

				if (html.substr(i, DOCTYPE.length).toUpperCase() === DOCTYPE) {
					i += DOCTYPE.length;
					while (i < html.length) {
						if (html[i++] === '>') {
							continue main;
						}
					}
				}

				// skip cdata
				if (html.substr(i, CDATA_OPEN.length) === CDATA_OPEN) {
					i += CDATA_OPEN.length;
					while (i < html.length) {
						if (html.substr(i, CDATA_CLOSE.length) === CDATA_CLOSE) {
							i += CDATA_CLOSE.length;
							continue main;
						}

						i += 1;
					}
				}

				// skip comments
				if (html.substr(i, COMMENT_OPEN.length) === COMMENT_OPEN) {
					i += COMMENT_OPEN.length;
					while (i < html.length) {
						if (html.substr(i, COMMENT_CLOSE.length) === COMMENT_CLOSE) {
							i += COMMENT_CLOSE.length;
							continue main;
						}

						i += 1;
					}
				}
			}

			// parse opening tags
			const start = ++i;
			if (TAG_OPEN.test(html[start])) {
				while (i < html.length) {
					if (!TAG_CHAR.test(html[i])) {
						break;
					}

					i += 1;
				}

				const tag = html.slice(start, i).toUpperCase();

				if (tag === 'SCRIPT' || tag === 'STYLE') {
					while (i < html.length) {
						if (
							html[i] === '<' &&
							html[i + 1] === '/' &&
							html.substr(i + 2, tag.length).toUpperCase() === tag
						) {
							continue main;
						}

						i += 1;
					}
				}

				/** @type {Record<string, string>} */
				const attributes = {};

				while (i < html.length) {
					const start = i;

					const char = html[start];
					if (char === '>') break;

					if (ATTRIBUTE_OPEN.test(char)) {
						i += 1;

						while (i < html.length) {
							if (!ATTRIBUTE_CHAR.test(html[i])) {
								break;
							}

							i += 1;
						}

						const name = html.slice(start, i);

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
