// This file contains Node-agnostic path utilities so that it can be used in
// environments that do not have access to `node:path` (e.g. Cloudflare Workers).

/**
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function relative(from, to) {
	const from_parts = from.split('/').filter(Boolean);
	const to_parts = to.split('/').filter(Boolean);
	let i = 0;
	while (i < from_parts.length && i < to_parts.length && from_parts[i] === to_parts[i]) i++;
	return [...Array(from_parts.length - i).fill('..'), ...to_parts.slice(i)].join('/') || '.';
}
