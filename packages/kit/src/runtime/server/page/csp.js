import { escape_html_attr } from '../../../utils/escape.js';
import { sha256 } from './crypto.js';

/** @type {Promise<void>} */
export let csp_ready;

/** @type {() => string} */
let generate_nonce;

if (typeof crypto !== 'undefined') {
	const array = new Uint8Array(16);

	generate_nonce = () => {
		crypto.getRandomValues(array);
		return base64(array);
	};
} else {
	csp_ready = import('crypto').then((crypto) => {
		generate_nonce = () => {
			return crypto.randomBytes(16).toString('base64');
		};
	});
}

const quoted = new Set([
	'self',
	'unsafe-eval',
	'unsafe-hashes',
	'unsafe-inline',
	'none',
	'strict-dynamic',
	'report-sample'
]);

const crypto_pattern = /^(nonce|sha\d\d\d)-/;

export class Csp {
	/** @type {boolean} */
	#use_hashes;

	/** @type {import('types/csp').CspDirectives} */
	#directives;

	/** @type {import('types/csp').Source[]} */
	#script_src;

	/** @type {import('types/csp').Source[]} */
	#style_src;

	/**
	 * @param {{
	 *   mode: string,
	 *   directives: import('types/csp').CspDirectives
	 * }} opts
	 * @param {boolean} prerender
	 */
	constructor({ mode, directives }, prerender) {
		this.#use_hashes = mode === 'hash' || (mode === 'auto' && prerender);
		this.#directives = { ...directives };

		this.#script_src = [];
		this.#style_src = [];

		const effective_script_src = directives['script-src'] || directives['default-src'];
		const effective_style_src = directives['style-src'] || directives['default-src'];

		this.script_needs_csp =
			effective_script_src &&
			effective_script_src.filter((value) => value !== 'unsafe-inline').length > 0;

		this.style_needs_csp =
			effective_style_src &&
			effective_style_src.filter((value) => value !== 'unsafe-inline').length > 0;

		this.script_needs_nonce = this.script_needs_csp && !this.#use_hashes;
		this.style_needs_nonce = this.style_needs_csp && !this.#use_hashes;

		if (this.script_needs_nonce || this.style_needs_nonce) {
			this.nonce = generate_nonce();
		}
	}

	// TODO would be great if these methods weren't async
	/** @param {string} content */
	add_script(content) {
		if (this.script_needs_csp) {
			if (this.#use_hashes) {
				this.#script_src.push(`sha256-${sha256(content)}`);
			} else if (this.#script_src.length === 0) {
				this.#script_src.push(`nonce-${this.nonce}`);
			}
		}
	}

	/** @param {string} content */
	add_style(content) {
		if (this.style_needs_csp) {
			if (this.#use_hashes) {
				this.#style_src.push(`sha256-${sha256(content)}`);
			} else if (this.#style_src.length === 0) {
				this.#style_src.push(`nonce-${this.nonce}`);
			}
		}
	}

	/** @param {boolean} [is_meta] */
	get_header(is_meta = false) {
		const header = [];

		// due to browser inconsistencies, we can't append sources to default-src
		// (specifically, Firefox appears to not ignore nonce-{nonce} directives
		// on default-src), so we ensure that script-src and style-src exist

		if (this.#script_src.length > 0) {
			if (!this.#directives['script-src']) {
				this.#directives['script-src'] = [...(this.#directives['default-src'] || [])];
			}

			this.#directives['script-src'].push(...this.#script_src);
		}

		if (this.#style_src.length > 0) {
			if (!this.#directives['style-src']) {
				this.#directives['style-src'] = [...(this.#directives['default-src'] || [])];
			}

			this.#directives['style-src'].push(...this.#style_src);
		}

		for (const key in this.#directives) {
			if (is_meta && (key === 'frame-ancestors' || key === 'report-uri' || key === 'sandbox')) {
				// these values cannot be used with a <meta> tag
				// TODO warn?
				continue;
			}

			// @ts-expect-error gimme a break typescript, `key` is obviously a member of this.#directives
			const value = /** @type {string[] | true} */ (this.#directives[key]);

			if (!value) continue;

			const directive = [key];
			if (Array.isArray(value)) {
				value.forEach((value) => {
					if (quoted.has(value) || crypto_pattern.test(value)) {
						directive.push(`'${value}'`);
					} else {
						directive.push(value);
					}
				});
			}

			header.push(directive.join(' '));
		}

		return header.join('; ');
	}

	get_meta() {
		const content = escape_html_attr(this.get_header(true));
		return `<meta http-equiv="content-security-policy" content=${content}`;
	}
}

/*
	Based on https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727

	MIT License
	Copyright (c) 2020 Egor Nepomnyaschih
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

/** @param {Uint8Array} bytes */
function base64(bytes) {
	const l = bytes.length;

	let result = '';
	let i;

	for (i = 2; i < l; i += 3) {
		result += chars[bytes[i - 2] >> 2];
		result += chars[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += chars[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)];
		result += chars[bytes[i] & 0x3f];
	}

	if (i === l + 1) {
		// 1 octet yet to write
		result += chars[bytes[i - 2] >> 2];
		result += chars[(bytes[i - 2] & 0x03) << 4];
		result += '==';
	}

	if (i === l) {
		// 2 octets yet to write
		result += chars[bytes[i - 2] >> 2];
		result += chars[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += chars[(bytes[i - 1] & 0x0f) << 2];
		result += '=';
	}

	return result;
}
