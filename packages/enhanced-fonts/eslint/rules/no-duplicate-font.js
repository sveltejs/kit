/** @import { Rule } from 'eslint' */
import {
	get_attribute,
	is_enhanced_font_element,
	literal_attribute_value,
	track_enhanced_font_imports
} from '../utils.js';

/** @type {Rule.RuleModule} */
export const no_duplicate_font = {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow two <Font> tags with the same literal cssVariable in one file',
			url: 'https://github.com/sveltejs/kit/discussions/17569'
		},
		schema: [],
		messages: {
			duplicateFont:
				'Duplicate <Font> for {{cssVariable}} in this file. Keep one tag per family on the owning layout or page.'
		}
	},
	create(context) {
		const imports = track_enhanced_font_imports();
		/** @type {any[]} */
		const elements = [];

		return {
			ImportDeclaration: imports.ImportDeclaration,
			/** @param {any} node */
			SvelteElement(node) {
				elements.push(node);
			},
			'Program:exit'() {
				/** @type {Set<string>} */
				const seen = new Set();
				for (const node of elements) {
					if (!is_enhanced_font_element(node, imports.locals)) continue;
					const attribute = get_attribute(node, 'cssVariable');
					const css_variable = literal_attribute_value(attribute);
					if (css_variable === null) continue;

					if (seen.has(css_variable)) {
						context.report({
							node: attribute ?? node,
							messageId: 'duplicateFont',
							data: { cssVariable: css_variable }
						});
						continue;
					}

					seen.add(css_variable);
				}
			}
		};
	}
};

export default no_duplicate_font;
