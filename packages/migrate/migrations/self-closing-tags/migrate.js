import MagicString from 'magic-string';
import { walk } from 'zimmerframe';

const VoidElements = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'keygen',
	'link',
	'menuitem',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
];

const SVGElements = [
	'altGlyph',
	'altGlyphDef',
	'altGlyphItem',
	'animate',
	'animateColor',
	'animateMotion',
	'animateTransform',
	'circle',
	'clipPath',
	'color-profile',
	'cursor',
	'defs',
	'desc',
	'discard',
	'ellipse',
	'feBlend',
	'feColorMatrix',
	'feComponentTransfer',
	'feComposite',
	'feConvolveMatrix',
	'feDiffuseLighting',
	'feDisplacementMap',
	'feDistantLight',
	'feDropShadow',
	'feFlood',
	'feFuncA',
	'feFuncB',
	'feFuncG',
	'feFuncR',
	'feGaussianBlur',
	'feImage',
	'feMerge',
	'feMergeNode',
	'feMorphology',
	'feOffset',
	'fePointLight',
	'feSpecularLighting',
	'feSpotLight',
	'feTile',
	'feTurbulence',
	'filter',
	'font',
	'font-face',
	'font-face-format',
	'font-face-name',
	'font-face-src',
	'font-face-uri',
	'foreignObject',
	'g',
	'glyph',
	'glyphRef',
	'hatch',
	'hatchpath',
	'hkern',
	'image',
	'line',
	'linearGradient',
	'marker',
	'mask',
	'mesh',
	'meshgradient',
	'meshpatch',
	'meshrow',
	'metadata',
	'missing-glyph',
	'mpath',
	'path',
	'pattern',
	'polygon',
	'polyline',
	'radialGradient',
	'rect',
	'set',
	'solidcolor',
	'stop',
	'svg',
	'switch',
	'symbol',
	'text',
	'textPath',
	'tref',
	'tspan',
	'unknown',
	'use',
	'view',
	'vkern'
];

/**
 * @param {{ preprocess: any, parse: any }} svelte_compiler
 * @param {string} source
 */
export async function remove_self_closing_tags({ preprocess, parse }, source) {
	const preprocessed = await preprocess(source, {
		/** @param {{ content: string }} input */
		script: ({ content }) => ({
			code: content
				.split('\n')
				.map((line) => ' '.repeat(line.length))
				.join('\n')
		}),
		/** @param {{ content: string }} input */
		style: ({ content }) => ({
			code: content
				.split('\n')
				.map((line) => ' '.repeat(line.length))
				.join('\n')
		})
	});
	const ast = parse(preprocessed.code);
	const ms = new MagicString(source);
	/** @type {Array<() => void>} */
	const updates = [];
	let is_foreign = false;
	let is_custom_element = false;

	walk(ast.html, null, {
		_(node, { next, stop }) {
			if (node.type === 'Options') {
				const namespace = node.attributes.find(
					/** @param {any} a */
					(a) => a.type === 'Attribute' && a.name === 'namespace'
				);
				if (namespace?.value[0].data === 'foreign') {
					is_foreign = true;
					stop();
					return;
				}

				is_custom_element = node.attributes.some(
					/** @param {any} a */
					(a) => a.type === 'Attribute' && (a.name === 'customElement' || a.name === 'tag')
				);
			}

			if (node.type === 'Element' || node.type === 'Slot') {
				const is_self_closing = source[node.end - 2] === '/';
				if (
					!is_self_closing ||
					VoidElements.includes(node.name) ||
					SVGElements.includes(node.name) ||
					!/^[a-z0-9_-]+$/.test(node.name)
				) {
					next();
					return;
				}

				let start = node.end - 2;
				if (source[start - 1] === ' ') {
					start--;
				}
				updates.push(() => {
					if (node.type === 'Element' || is_custom_element) {
						ms.update(start, node.end, `></${node.name}>`);
					}
				});
			}

			next();
		}
	});

	if (is_foreign) {
		return source;
	}

	updates.forEach((update) => update());
	return ms.toString();
}
