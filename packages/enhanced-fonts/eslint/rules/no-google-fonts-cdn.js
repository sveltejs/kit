/** @import { Rule } from 'eslint' */
import {
	element_name,
	get_attribute,
	google_font_host,
	google_font_imports,
	literal_attribute_value,
	style_css_text
} from '../utils.js';

/**
 * @param {Rule.RuleContext} context
 * @param {any} node
 * @param {string} host
 */
function report_cdn(context, node, host) {
	context.report({
		node,
		messageId: 'googleCdn',
		data: { host }
	});
}

/**
 * @param {Rule.RuleContext} context
 * @param {any} node
 */
function check_style(context, node) {
	const css = style_css_text(node, context);
	if (!css) return;

	const css_start = node.startTag?.range?.[1] ?? node.range?.[0] ?? 0;
	for (const match of google_font_imports(css)) {
		const start = css_start + match.index;
		const end = start + match.length;
		context.report({
			loc: {
				start: context.sourceCode.getLocFromIndex(start),
				end: context.sourceCode.getLocFromIndex(end)
			},
			messageId: 'googleCdn',
			data: { host: match.host }
		});
	}
}

/** @type {Rule.RuleModule} */
export const no_google_fonts_cdn = {
	meta: {
		type: 'problem',
		docs: {
			description:
				'disallow leftover Google Fonts CDN <link> and @import (use @sveltejs/enhanced-fonts instead)',
			url: 'https://github.com/sveltejs/kit/discussions/17569'
		},
		schema: [],
		messages: {
			googleCdn: 'Do not load fonts from {{host}}. Self-host with @sveltejs/enhanced-fonts instead.'
		}
	},
	create(context) {
		return {
			/** @param {any} node */
			SvelteElement(node) {
				const name = element_name(node);
				if (name === 'link') {
					const href = literal_attribute_value(get_attribute(node, 'href'));
					const host = href ? google_font_host(href) : null;
					if (host) report_cdn(context, get_attribute(node, 'href') ?? node, host);
					return;
				}
				if (name === 'style') {
					check_style(context, node);
				}
			},
			/** @param {any} node */
			SvelteStyleElement(node) {
				check_style(context, node);
			}
		};
	}
};

export default no_google_fonts_cdn;
