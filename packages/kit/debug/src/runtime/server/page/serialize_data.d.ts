/**
 * Generates a raw HTML string containing a safe script element carrying data and associated attributes.
 *
 * It escapes all the special characters needed to guarantee the element is unbroken, but care must
 * be taken to ensure it is inserted in the document at an acceptable position for a script element,
 * and that the resulting string isn't further modified.
 *
 * @param {import('./types.js').Fetched} fetched
 * @param {(name: string, value: string) => boolean} filter
 * @param {boolean} [prerendering]
 * @returns {string} The raw HTML of a script element carrying the JSON payload.
 * @example const html = serialize_data('/data.json', null, { foo: 'bar' });
 */
export function serialize_data(fetched: import('./types.js').Fetched, filter: (name: string, value: string) => boolean, prerendering?: boolean | undefined): string;
//# sourceMappingURL=serialize_data.d.ts.map