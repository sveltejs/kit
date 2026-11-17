/** @import { Rule } from 'eslint' */

const GOOGLE_FONT_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const ENHANCED_FONT_MODULE = '@sveltejs/enhanced-fonts/Font.svelte';

/**
 * @param {any} node
 * @returns {string | null}
 */
export function element_name(node) {
	const name = node?.name;
	if (!name) return null;
	if (typeof name === 'string') return name;
	if (typeof name.name === 'string') return name.name;
	return null;
}

/**
 * @param {any} node
 * @param {string} name
 * @returns {any | undefined}
 */
export function get_attribute(node, name) {
	const attributes = node?.startTag?.attributes;
	if (!Array.isArray(attributes)) return;
	return attributes.find(
		(attribute) => attribute?.type === 'SvelteAttribute' && attribute.key?.name === name
	);
}

/**
 * Literal attribute value, or `null` when the value is dynamic (`cssVariable={x}`).
 *
 * @param {any} attribute
 * @returns {string | null}
 */
export function literal_attribute_value(attribute) {
	if (!attribute || attribute.value === true || !Array.isArray(attribute.value)) {
		return null;
	}

	let result = '';
	for (const part of attribute.value) {
		if (part?.type === 'SvelteLiteral' && typeof part.value === 'string') {
			result += part.value;
			continue;
		}

		if (part?.type === 'SvelteMustacheTag') {
			const literal = mustache_string_literal(part.expression);
			if (literal === null) return null;
			result += literal;
			continue;
		}

		return null;
	}

	return result;
}

/**
 * @param {any} expression
 * @returns {string | null}
 */
function mustache_string_literal(expression) {
	if (!expression) return null;
	if (expression.type === 'Literal' && typeof expression.value === 'string') {
		return expression.value;
	}
	if (
		expression.type === 'TemplateLiteral' &&
		expression.expressions.length === 0 &&
		typeof expression.quasis?.[0]?.value?.cooked === 'string'
	) {
		return expression.quasis[0].value.cooked;
	}
	return null;
}

/**
 * Local names bound to `@sveltejs/enhanced-fonts/Font.svelte`, including aliases.
 *
 * @returns {{
 *   locals: Set<string>
 *   ImportDeclaration: (node: any) => void
 * }}
 */
export function track_enhanced_font_imports() {
	/** @type {Set<string>} */
	const locals = new Set();

	return {
		locals,
		/** @param {any} node */
		ImportDeclaration(node) {
			if (node.source?.value !== ENHANCED_FONT_MODULE) return;
			for (const specifier of node.specifiers ?? []) {
				const local = specifier.local?.name;
				if (typeof local !== 'string') continue;
				if (specifier.type === 'ImportDefaultSpecifier') {
					locals.add(local);
					continue;
				}
				if (specifier.type !== 'ImportSpecifier') continue;
				const imported = specifier.imported?.name ?? specifier.imported?.value;
				if (imported === 'default' || imported === 'Font') {
					locals.add(local);
				}
			}
		}
	};
}

/**
 * @param {any} node
 * @param {Set<string>} locals
 */
export function is_enhanced_font_element(node, locals) {
	const name = element_name(node);
	return Boolean(name && locals.has(name));
}

/**
 * @param {string} href
 * @returns {string | null}
 */
export function google_font_host(href) {
	if (typeof href !== 'string' || href.length === 0) return null;
	try {
		const url = new URL(href, 'https://enhanced-fonts.invalid');
		const host = url.hostname.toLowerCase();
		return GOOGLE_FONT_HOSTS.has(host) ? host : null;
	} catch {
		return null;
	}
}

/**
 * @param {string} css
 * @returns {Array<{ host: string, index: number, length: number }>}
 */
export function google_font_imports(css) {
	/** @type {Array<{ host: string, index: number, length: number }>} */
	const matches = [];
	const ignored = css_string_and_comment_ranges(css);
	const pattern = /@import\b/gi;

	let at_import;
	while ((at_import = pattern.exec(css)) !== null) {
		if (in_ranges(at_import.index, ignored)) continue;

		const parsed = read_css_import_href(css, at_import.index + at_import[0].length);
		if (!parsed) continue;
		const host = google_font_host(parsed.href);
		if (!host) continue;
		matches.push({
			host,
			index: at_import.index,
			length: parsed.end - at_import.index
		});
	}

	return matches;
}

/**
 * @param {any} node
 * @param {Rule.RuleContext} context
 * @returns {string}
 */
export function style_css_text(node, context) {
	if (node.startTag?.range && node.endTag?.range) {
		return context.sourceCode.text.slice(node.startTag.range[1], node.endTag.range[0]);
	}
	if (!Array.isArray(node.children)) return '';
	return node.children
		.map((/** @type {any} */ child) => (typeof child.value === 'string' ? child.value : ''))
		.join('');
}

/**
 * @param {string} css
 * @param {number} index
 * @returns {{ href: string, end: number } | null}
 */
function read_css_import_href(css, index) {
	let i = skip_css_ws_and_comments(css, index);
	if (i >= css.length) return null;

	if (/^url\b/i.test(css.slice(i))) {
		i = skip_css_ws_and_comments(css, i + 3);
		if (css[i] !== '(') return null;
		i = skip_css_ws_and_comments(css, i + 1);
		const href = read_css_url_argument(css, i);
		if (!href) return null;
		i = skip_css_ws_and_comments(css, href.end);
		if (css[i] === ')') i++;
		return { href: href.value, end: i };
	}

	if (css[i] === '"' || css[i] === "'") {
		const quoted = read_css_quoted(css, i);
		return quoted ? { href: quoted.value, end: quoted.end } : null;
	}

	return null;
}

/**
 * @param {string} css
 * @param {number} index
 * @returns {{ value: string, end: number } | null}
 */
function read_css_url_argument(css, index) {
	if (css[index] === '"' || css[index] === "'") {
		return read_css_quoted(css, index);
	}

	let end = index;
	while (
		end < css.length &&
		css[end] !== ')' &&
		!/\s/.test(css[end]) &&
		!(css[end] === '/' && css[end + 1] === '*')
	) {
		end++;
	}
	if (end === index) return null;
	return { value: css.slice(index, end), end };
}

/**
 * @param {string} css
 * @param {number} index
 * @returns {{ value: string, end: number } | null}
 */
function read_css_quoted(css, index) {
	const quote = css[index];
	if (quote !== '"' && quote !== "'") return null;
	let i = index + 1;
	let value = '';
	while (i < css.length) {
		const ch = css[i];
		if (ch === '\\') {
			value += css[i + 1] ?? '';
			i += 2;
			continue;
		}
		if (ch === quote) {
			return { value, end: i + 1 };
		}
		value += ch;
		i++;
	}
	return null;
}

/**
 * @param {string} css
 * @param {number} index
 */
function skip_css_ws_and_comments(css, index) {
	let i = index;
	while (i < css.length) {
		const ch = css[i];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (ch === '/' && css[i + 1] === '*') {
			const close = css.indexOf('*/', i + 2);
			i = close === -1 ? css.length : close + 2;
			continue;
		}
		break;
	}
	return i;
}

/**
 * Comment and quoted-string ranges so `@import` inside `content: "..."` is ignored.
 *
 * @param {string} css
 * @returns {Array<[number, number]>}
 */
function css_string_and_comment_ranges(css) {
	/** @type {Array<[number, number]>} */
	const ranges = [];
	let i = 0;
	while (i < css.length) {
		if (css[i] === '/' && css[i + 1] === '*') {
			const close = css.indexOf('*/', i + 2);
			const end = close === -1 ? css.length : close + 2;
			ranges.push([i, end]);
			i = end;
			continue;
		}
		if (css[i] === '"' || css[i] === "'") {
			const quoted = read_css_quoted(css, i);
			const end = quoted ? quoted.end : css.length;
			ranges.push([i, end]);
			i = end;
			continue;
		}
		i++;
	}
	return ranges;
}

/**
 * @param {number} index
 * @param {Array<[number, number]>} ranges
 */
function in_ranges(index, ranges) {
	return ranges.some(([start, end]) => index >= start && index < end);
}
