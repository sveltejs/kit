import { escape_html_attr } from '../../../utils/escape.js';
import { sha256, base64 } from './crypto.js';

/** @type {Promise<void>} */
export let csp_ready;

/** @type {() => string} */
let generate_nonce;

/** @type {(input: string) => string} */
let generate_hash;

if (typeof crypto !== 'undefined') {
	const array = new Uint8Array(16);

	generate_nonce = () => {
		crypto.getRandomValues(array);
		return base64(array);
	};

	generate_hash = sha256;
} else {
	// TODO: remove this in favor of web crypto API once we no longer support Node 14
	const name = 'crypto'; // store in a variable to fool esbuild when adapters bundle kit
	csp_ready = import(name).then((crypto) => {
		generate_nonce = () => {
			return crypto.randomBytes(16).toString('base64');
		};

		generate_hash = (input) => {
			return crypto.createHash('sha256').update(input, 'utf-8').digest().toString('base64');
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

	/** @type {boolean} */
	#dev;

	/** @type {boolean} */
	#script_needs_csp;

	/** @type {boolean} */
	#style_needs_csp;

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
	 * }} config
	 * @param {{
	 *   dev: boolean;
	 *   prerender: boolean;
	 *   needs_nonce: boolean;
	 * }} opts
	 */
	constructor({ mode, directives }, { dev, prerender, needs_nonce }) {
		this.#use_hashes = mode === 'hash' || (mode === 'auto' && prerender);
		this.#directives = dev ? { ...directives } : directives; // clone in dev so we can safely mutate
		this.#dev = dev;

		const d = this.#directives;

		if (dev) {
			// remove strict-dynamic in dev...
			// TODO reinstate this if we can figure out how to make strict-dynamic work
			// if (d['default-src']) {
			// 	d['default-src'] = d['default-src'].filter((name) => name !== 'strict-dynamic');
			// 	if (d['default-src'].length === 0) delete d['default-src'];
			// }

			// if (d['script-src']) {
			// 	d['script-src'] = d['script-src'].filter((name) => name !== 'strict-dynamic');
			// 	if (d['script-src'].length === 0) delete d['script-src'];
			// }

			const effective_style_src = d['style-src'] || d['default-src'];

			// ...and add unsafe-inline so we can inject <style> elements
			if (effective_style_src && !effective_style_src.includes('unsafe-inline')) {
				d['style-src'] = [...effective_style_src, 'unsafe-inline'];
			}
		}

		this.#script_src = [];
		this.#style_src = [];

		const effective_script_src = d['script-src'] || d['default-src'];
		const effective_style_src = d['style-src'] || d['default-src'];

		this.#script_needs_csp =
			!!effective_script_src &&
			effective_script_src.filter((value) => value !== 'unsafe-inline').length > 0;

		this.#style_needs_csp =
			!dev &&
			!!effective_style_src &&
			effective_style_src.filter((value) => value !== 'unsafe-inline').length > 0;

		this.script_needs_nonce = this.#script_needs_csp && !this.#use_hashes;
		this.style_needs_nonce = this.#style_needs_csp && !this.#use_hashes;

		if (this.script_needs_nonce || this.style_needs_nonce || needs_nonce) {
			this.nonce = generate_nonce();
		}
	}

	/** @param {string} content */
	add_script(content) {
		if (this.#script_needs_csp) {
			if (this.#use_hashes) {
				this.#script_src.push(`sha256-${generate_hash(content)}`);
			} else if (this.#script_src.length === 0) {
				this.#script_src.push(`nonce-${this.nonce}`);
			}
		}
	}

	/** @param {string} content */
	add_style(content) {
		if (this.#style_needs_csp) {
			if (this.#use_hashes) {
				this.#style_src.push(`sha256-${generate_hash(content)}`);
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

		const directives = { ...this.#directives };

		if (this.#style_src.length > 0) {
			directives['style-src'] = [
				...(directives['style-src'] || directives['default-src'] || []),
				...this.#style_src
			];
		}

		if (this.#script_src.length > 0) {
			directives['script-src'] = [
				...(directives['script-src'] || directives['default-src'] || []),
				...this.#script_src
			];
		}

		for (const key in directives) {
			if (is_meta && (key === 'frame-ancestors' || key === 'report-uri' || key === 'sandbox')) {
				// these values cannot be used with a <meta> tag
				// TODO warn?
				continue;
			}

			// @ts-expect-error gimme a break typescript, `key` is obviously a member of directives
			const value = /** @type {string[] | true} */ (directives[key]);

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
		return `<meta http-equiv="content-security-policy" content=${content}>`;
	}
}
