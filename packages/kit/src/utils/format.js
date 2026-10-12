/**
 * Joins a list as `a`, `a or b` or `a, b or c`, for use in diagnostics
 * @param {string[]} items
 */
export function join_or(items) {
	return items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : items[0];
}

/**
 * Formats a list with one indented `- item` per line, for use in diagnostics
 * @param {string[]} items
 */
export function bullet_list(items) {
	return items.map((item) => `  - ${item}`).join('\n');
}
