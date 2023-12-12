import { parse } from 'svelte/compiler';
import MagicString from 'magic-string';
import { dedent } from '../../../core/sync/utils.js';

const rewritten_attributes = [
	['a', 'href'],
	['form', 'action'],
	['button', 'formaction']
]

/**
 * Rewrites every single href attribute in the markup, so that it's wrapped
 * with the resolveDestination router-hook.
 *
 * @example
 * ```diff
 * - <a href="/about">About</a>
 * + <a href={resolveDestination(`/about`)}>About</a>
 * ```
 *
 * @param {{ router_hook_entry : string }} config
 * @returns {import("svelte/compiler").PreprocessorGroup}
 */
export const resolve_destination_preprocessor = ({ router_hook_entry }) => ({
	markup({ content }) {

		//Do some quick checks to see if we need to do anything
		// keep trach of the tag_name - attribute_name pairs that may be present
		const matchedAttributeIndexes = [];
		for (let i = 0; i < rewritten_attributes.length; i++) {
			const [_tag_name, attribute_name] = rewritten_attributes[i];
			if(content.includes(attribute_name)) matchedAttributeIndexes.push(i);
		}

		//If none of the attributes are present, skip parsing & processing
		if (matchedAttributeIndexes.length === 0 ) return;
		
		const ast = parse(content);
		const s = new MagicString(content);


		let rewroteAttribute = false;

		//For all the matched attributes, find all the elements and rewrite the attributes
		for (const index of matchedAttributeIndexes) {
			const [tag_name, attribute_name] = rewritten_attributes[index];
			const elements = getElements(ast, tag_name);
			if (!elements.length) continue;

			for (const element of elements) {
				/** @type {import("svelte/types/compiler/interfaces").Attribute[]} */
				const attributes = element.attributes || [];

				const attribute = attributes.find((attribute) => attribute.name === attribute_name);
				if (!attribute) continue;

				const attributeTemplateString = attributeToTemplateString(attribute, content);

				const newAttribute = `${attribute_name}={${i('resolveHref')}(${attributeTemplateString})}`;
				s.overwrite(attribute.start, attribute.end, newAttribute);
				rewroteAttribute = true;
			}
		}

		//If none of the attributes were rewritten, skip adding the code
		if(!rewroteAttribute) return;

		addCodeToScript(
			ast,
			s,
			dedent`
            import { page as ${i('page')} } from "$app/stores";
            import * as ${i('router_hooks')} from "${router_hook_entry}";

			/**
			 * @param {string} href
			 * @returns {string}
			 */
            function ${i('resolveHref')}(href) {
				const resolve_destination = ${i('router_hooks')}.resolveDestination;

				//If there is no hook, bail
				if (!resolve_destination) return href;

				//Resolve the origin & destination of the navigation
				const from = $${i('page')}.url;
				const to = new URL(href, from);

				// rewrite the href attribute
				return resolve_destination({ from, to }).href;
			}
        	`
		);

		const code = s.toString();
		const map = s.generateMap({ hires: true });
		return { code, map };
	}
});

/**
 * @param {import('svelte/types/compiler/interfaces').Ast} ast
 * @param {MagicString} s
 * @param {string} code
 */
function addCodeToScript(ast, s, code) {
	if (ast.instance) {
		// @ts-ignore
		const start = ast.instance.content.start;
		s.appendRight(start, '\n' + code + '\n');
	} else {
		s.prepend(
			dedent`
            <script>
                ${code}
            </script>
            `
		);
	}
}

/**
 * @param {import("svelte/types/compiler/interfaces").Attribute} attribute
 * @param {string} originalCode
 * @returns {string} A string that contains the source code of a template string
 */
function attributeToTemplateString(attribute, originalCode) {
	const values = attribute.value;
	let templateString = '`';

	for (const value of values) {
		switch (value.type) {
			case 'Text':
				templateString += escapeStringLiteral(value.data);
				break;
			case 'AttributeShorthand':
			case 'MustacheTag': {
				const expressionCode = originalCode.slice(value.expression.start, value.expression.end);
				templateString += '${';
				templateString += expressionCode;
				templateString += '}';
				break;
			}
		}
	}

	templateString += '`';
	return templateString;
}

/**
 * @param {import("svelte/types/compiler/interfaces").Ast} ast
 * @param {string} name
 * @returns {import("svelte/types/compiler/interfaces").TemplateNode[]}
 */
function getElements(ast, name) {
	/** @type {import("svelte/types/compiler/interfaces").TemplateNode[]} */
	const elements = [];

	/** @param {import("svelte/types/compiler/interfaces").TemplateNode} templateNode */
	function walk(templateNode) {
		if (templateNode.type === 'Element' && templateNode.name === name) {
			elements.push(templateNode);
		}

		if (!templateNode.children) return;
		for (const child of templateNode.children) {
			walk(child);
		}
	}

	walk(ast.html);
	return elements;
}

/**
 * @param {string} string
 * @returns {string}
 */
function escapeStringLiteral(string) {
	return string.replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

/**
 * Takes in a JS identifier and returns a globally unique, deterministic alias for it that can be used safely
 * @name Identifier
 * @param {string} original_identifier
 * @returns {string}
 */
function i(original_identifier) {
	return `sk_internal_${original_identifier}`;
}
