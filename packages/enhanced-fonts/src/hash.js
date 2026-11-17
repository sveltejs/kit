import { createHash } from 'node:crypto';

/**
 * @param {Buffer | Uint8Array} bytes
 * @returns {string}
 */
export function content_hash(bytes) {
	return createHash('sha256').update(bytes).digest('hex').slice(0, 8);
}

/**
 * @param {string} name
 * @returns {string}
 */
export function slug(name) {
	const s = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return s || 'font';
}
