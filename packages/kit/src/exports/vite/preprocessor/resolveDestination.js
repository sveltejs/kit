import { parse } from 'svelte/compiler';
import MagicString from 'magic-string';
import { dedent } from '../../../core/sync/utils.js';

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
		if (!content.includes('href')) return;

		const ast = parse(content);
		const links = getElements(ast, 'a');
		if (!links.length) return;

		const s = new MagicString(content);

		for (const link of links) {
			/** @type {import("svelte/types/compiler/interfaces").Attribute[]} */
			const attributes = link.attributes || [];

			const hrefAttribute = attributes.find((attribute) => attribute.name === 'href');
			if (!hrefAttribute) continue;

			const attributeTemplateString = attributeToTemplateString(hrefAttribute, content);

			const newAttribute = `href={${i('resolveHref')}(${attributeTemplateString})}`;
			s.overwrite(hrefAttribute.start, hrefAttribute.end, newAttribute);
		}

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
				if (!resolve_destination) return href;

				const from = $${i('page')}.url;
				const to = new URL(href, from);

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
