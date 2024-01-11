/**
 * Formats a string to be used as an attribute's value in raw HTML.
 *
 * It escapes unpaired surrogates (which are allowed in js strings but invalid in HTML), escapes
 * characters that are special in attributes, and surrounds the whole string in double-quotes.
 *
 * @param {string} str
 * @returns {string} Escaped string surrounded by double-quotes.
 * @example const html = `<tag data-value=${escape_html_attr('value')}>...</tag>`;
 */
export function escape_html_attr(str: string): string;
//# sourceMappingURL=escape.d.ts.map