/** @import { Rule } from 'eslint' */
import { is_font_css_variable } from '../../src/schema.js';
import {
	get_attribute,
	is_enhanced_font_element,
	literal_attribute_value,
	track_enhanced_font_imports
} from '../utils.js';

/** @type {Rule.RuleModule} */
export const css_variable_prefix = {
	meta: {
		type: 'problem',
		docs: {
			description: 'require <Font cssVariable> to be a --font-* custom property',
			url: 'https://github.com/sveltejs/kit/discussions/17569'
		},
		schema: [],
		messages: {
			prefix: 'cssVariable must be a --font-* custom property (received {{cssVariable}}).'
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
				for (const node of elements) {
					if (!is_enhanced_font_element(node, imports.locals)) continue;
					const attribute = get_attribute(node, 'cssVariable');
					const css_variable = literal_attribute_value(attribute);
					if (css_variable === null) continue;
					if (is_font_css_variable(css_variable)) continue;

					context.report({
						node: attribute ?? node,
						messageId: 'prefix',
						data: { cssVariable: css_variable }
					});
				}
			}
		};
	}
};

export default css_variable_prefix;
