/** @import { HtmlTagDescriptor } from 'vite' */
/** @import { Csp } from './csp.js' */
import { escape_html } from '../../../utils/escape.js';

const void_elements = new Set(['base', 'link', 'meta']);

/**
 * Serializes the tags that Vite plugins return from `transformIndexHtml`, grouped by where they go.
 * Inline scripts and styles are added to the CSP, and scripts and styles get its nonce
 * @param {HtmlTagDescriptor[]} tags
 * @param {Csp} csp
 */
export async function serialize_dev_html_tags(tags, csp) {
	const result = {
		'head-prepend': '',
		head: '',
		'body-prepend': '',
		body: ''
	};

	for (const tag of tags) {
		// Vite puts tags at the start of the head by default
		result[tag.injectTo ?? 'head-prepend'] += await serialize_tag(tag, csp);
	}

	return result;
}

/**
 * @param {HtmlTagDescriptor} tag
 * @param {Csp} [csp] only applied to top-level tags
 * @returns {Promise<string>}
 */
async function serialize_tag({ tag, attrs, children }, csp) {
	/** @type {Record<string, string | boolean | undefined>} */
	const attributes = { ...attrs };

	if (csp && tag === 'script') {
		if (typeof children === 'string' && children) await csp.add_script(children);
		if (csp.script_needs_nonce) attributes.nonce = csp.nonce;
	}

	if (csp && tag === 'style') {
		if (typeof children === 'string' && children) await csp.add_style(children);
		if (csp.style_needs_nonce) attributes.nonce = csp.nonce;
	}

	let html = `<${tag}`;

	for (const [name, value] of Object.entries(attributes)) {
		if (value === true) html += ` ${name}`;
		else if (value !== undefined && value !== false)
			html += ` ${name}="${escape_html(value, true)}"`;
	}

	html += '>';

	if (void_elements.has(tag)) return html;

	if (typeof children === 'string') {
		html += children;
	} else if (children) {
		for (const child of children) html += await serialize_tag(child);
	}

	return html + `</${tag}>`;
}
