import { escape_html_attr } from '../../../utils/escape.js';
import { sha256, base64 } from './crypto.js';

/** @type {Promise<void>} */
export let csp_ready;

const array = new Uint8Array(16);

function generate_nonce() {
	crypto.getRandomValues(array);
	return base64(array);
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

// CSP and CSP Report Only are extremely similar with a few caveats
// the easiest/DRYest way to express this is with some private encapsulation
class CspProvider {
	/** @type {boolean} */
	#use_hashes;

	/** @type {boolean} */
	#dev;

	/** @type {boolean} */
	#script_needs_csp;

	/** @type {boolean} */
	#style_needs_csp;

	/** @type {import('types').CspDirectives} */
	#directives;

	/** @type {boolean} */
	#report_only;

	/** @type {import('types').Csp.Source[]} */
	#script_src;

	/** @type {import('types').Csp.Source[]} */
	#style_src;

	/**
	 * @param {{
	 *   mode: string,
	 *   directives: import('types').CspDirectives,
	 *   report_only: boolean
	 * }} config
	 * @param {{
	 *   dev: boolean;
	 *   prerender: boolean;
	 *   needs_nonce: boolean;
	 * }} opts
	 */
	constructor({ mode, directives, report_only = false }, { dev, prerender, needs_nonce }) {
		this.#use_hashes = mode === 'hash' || (mode === 'auto' && prerender);
		this.#directives = dev ? { ...directives } : directives; // clone in dev so we can safely mutate
		this.#dev = dev;
		this.#report_only = report_only;

		const d = this.#directives;

		if (this.#report_only && Object.values(d).filter((v) => !!v).length > 0) {
			// If we're generating content-security-policy-report-only,
			// if there are any directives, we need a report-uri or report-to (or both)
			// else it's just an expensive noop.
			const has_report_to = !!d['report-to'] && d['report-to']?.length > 0;
			const has_report_uri = !!d['report-uri'] && d['report-uri']?.length > 0;
			if (!has_report_to && !has_report_uri) {
				throw Error(
					'`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both'
				);
			}
		}

		if (this.#dev) {
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
				this.#script_src.push(`sha256-${sha256(content)}`);
			} else if (this.#script_src.length === 0) {
				this.#script_src.push(`nonce-${this.nonce}`);
			}
		}
	}

	/** @param {string} content */
	add_style(content) {
		if (this.#style_needs_csp) {
			if (this.#use_hashes) {
				this.#style_src.push(`sha256-${sha256(content)}`);
			} else if (this.#style_src.length === 0) {
				this.#style_src.push(`nonce-${this.nonce}`);
			}
		}
	}

	/**
	 * @param {boolean} [is_meta]
	 */
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

			// @ts-expect-error gimme a break typescript, `key` is obviously a member of internal_directives
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
		if (this.#report_only) {
			throw Error('`content-security-policy-report-only` is not valid in the <meta> tag');
		}
		const content = escape_html_attr(this.get_header(true));
		return `<meta http-equiv="content-security-policy" content=${content}>`;
	}
}

export class Csp {
	/** @type {CspProvider} */
	#csp_provider;

	/** @type {CspProvider} */
	#report_only_provider;

	/**
	 * @param {{
	 *   mode: string,
	 *   directives: import('types').CspDirectives
	 *   reportOnly: import('types').CspDirectives,
	 * }} config
	 * @param {{
	 *   dev: boolean;
	 *   prerender: boolean;
	 *   needs_nonce: boolean;
	 * }} opts
	 */
	constructor({ mode, directives, reportOnly }, opts) {
		this.#csp_provider = new CspProvider({ mode, directives, report_only: false }, opts);
		this.#report_only_provider = new CspProvider(
			{ mode, directives: reportOnly, report_only: true },
			opts
		);
	}

	get nonce() {
		return this.#csp_provider.nonce;
	}

	get report_only_nonce() {
		return this.#report_only_provider.nonce;
	}

	get script_needs_nonce() {
		return this.#csp_provider.script_needs_nonce;
	}

	get report_only_script_needs_nonce() {
		return this.#report_only_provider.script_needs_nonce;
	}

	get style_needs_nonce() {
		return this.#csp_provider.style_needs_nonce;
	}

	get report_only_style_needs_nonce() {
		return this.#report_only_provider.style_needs_nonce;
	}

	/** @param {string} content */
	add_script(content) {
		this.#csp_provider.add_script(content);
		this.#report_only_provider.add_script(content);
	}

	/** @param {string} content */
	add_style(content) {
		this.#csp_provider.add_style(content);
		this.#report_only_provider.add_style(content);
	}

	/**
	 * @param {boolean} [is_meta]
	 */
	get_header(is_meta = false) {
		return this.#csp_provider.get_header(is_meta);
	}

	/**
	 * @param {boolean} [is_meta]
	 */
	get_report_only_header(is_meta = false) {
		return this.#report_only_provider.get_header(is_meta);
	}

	get_meta() {
		return this.#csp_provider.get_meta();
	}
}
