import MagicString from 'magic-string';
import { asyncWalk } from 'estree-walker';
import { parse } from 'svelte-parse-markup';

const ASSET_PREFIX = '___ASSET___';

// TODO: expose this in vite-imagetools rather than duplicating it
const OPTIMIZABLE = /^[^?]+\.(avif|heif|gif|jpeg|jpg|png|tiff|webp)(\?.*)?$/;

/**
 * @param {{
 *   plugin_context: import('vite').Rollup.PluginContext
 *   imagetools_plugin: import('vite').Plugin
 * }} opts
 * @returns {import('svelte/types/compiler/preprocess').PreprocessorGroup}
 */
export function image(opts) {
	// TODO: clear this map in dev mode to avoid memory leak
	/**
	 * URL to image details
	 * @type {Map<string, import('vite-imagetools').Picture>}
	 */
	const images = new Map();

	return {
		async markup({ content, filename }) {
			if (!content.includes('<enhanced:img')) {
				return;
			}

			const s = new MagicString(content);
			const ast = parse(content, { filename });

			// Import path to import name
			// e.g. ./foo.png => ___ASSET___0
			/** @type {Map<string, string>} */
			const imports = new Map();

			/**
			 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
			 * @param {{ type: string, start: number, end: number, raw: string }} src_attribute
			 * @returns {Promise<void>}
			 */
			async function update_element(node, src_attribute) {
				// TODO: this will become ExpressionTag in Svelte 5
				if (src_attribute.type === 'MustacheTag') {
					const src_var_name = content
						.substring(src_attribute.start + 1, src_attribute.end - 1)
						.trim();
					s.update(node.start, node.end, dynamic_img_to_picture(content, node, src_var_name));
					return;
				}

				const original_url = src_attribute.raw.trim();
				let url = original_url;

				const sizes = get_attr_value(node, 'sizes');
				const width = get_attr_value(node, 'width');
				url += url.includes('?') ? '&' : '?';
				if (sizes) {
					url += 'imgSizes=' + encodeURIComponent(sizes.raw) + '&';
				}
				if (width) {
					url += 'imgWidth=' + encodeURIComponent(width.raw) + '&';
				}
				url += 'enhanced';

				if (OPTIMIZABLE.test(url)) {
					let image = images.get(url);
					if (!image) {
						// resolves the import so that we can build the entire picture template string and don't
						// need any logic blocks
						image = await resolve(opts, url, filename);
						if (!image) {
							return;
						}
						images.set(url, image);
					}
					s.update(node.start, node.end, img_to_picture(content, node, image));
				} else {
					// e.g. <img src="./foo.svg" /> => <img src={___ASSET___0} />
					const name = ASSET_PREFIX + imports.size;
					const { start, end } = src_attribute;
					// update src with reference to imported asset
					s.update(
						is_quote(content, start - 1) ? start - 1 : start,
						is_quote(content, end) ? end + 1 : end,
						`{${name}}`
					);
					// update `enhanced:img` to `img`
					s.update(node.start + 1, node.start + 1 + 'enhanced:img'.length, 'img');
					imports.set(original_url, name);
				}
			}

			// TODO: switch to zimmerframe with Svelte 5
			// @ts-ignore
			await asyncWalk(ast.html, {
				/**
				 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
				 */
				async enter(node) {
					if (node.type === 'Element') {
						// Compare node tag match
						if (node.name === 'enhanced:img') {
							const src = get_attr_value(node, 'src');
							if (!src) return;
							await update_element(node, src);
						}
					}
				}
			});

			// add imports
			if (imports.size) {
				let import_text = '';
				for (const [path, import_name] of imports.entries()) {
					import_text += `import ${import_name} from "${path}";`;
				}
				if (ast.instance) {
					// @ts-ignore
					s.appendLeft(ast.instance.content.start, import_text);
				} else {
					s.append(`<script>${import_text}</script>`);
				}
			}

			return {
				code: s.toString(),
				map: s.generateMap()
			};
		}
	};
}

/**
 * @param {string} content
 * @param {number} index
 * @returns {boolean}
 */
function is_quote(content, index) {
	return content.charAt(index) === '"' || content.charAt(index) === "'";
}

/**
 * @param {{
 *   plugin_context: import('vite').Rollup.PluginContext
 *   imagetools_plugin: import('vite').Plugin
 * }} opts
 * @param {string} url
 * @param {string | undefined} importer
 * @returns {Promise<import('vite-imagetools').Picture | undefined>}
 */
async function resolve(opts, url, importer) {
	const resolved = await opts.plugin_context.resolve(url, importer);
	const id = resolved?.id;
	if (!id) {
		return;
	}
	if (!opts.imagetools_plugin.load) {
		throw new Error('Invalid instance of vite-imagetools. Could not find load method.');
	}
	const hook = opts.imagetools_plugin.load;
	const handler = typeof hook === 'object' ? hook.handler : hook;
	const module_info = await handler.call(opts.plugin_context, id);
	if (!module_info) {
		throw new Error(`Could not load ${id}`);
	}
	const code = typeof module_info === 'string' ? module_info : module_info.code;
	return parseObject(code.replace('export default', '').replace(/;$/, '').trim());
}

/**
 * @param {string} str
 */
export function parseObject(str) {
	const updated = str
		.replaceAll(/{(\n\s*)?/gm, '{"')
		.replaceAll(':', '":')
		.replaceAll(/,(\n\s*)?([^ ])/g, ',"$2');
	try {
		return JSON.parse(updated);
	} catch (err) {
		throw new Error(`Failed parsing string to object: ${str}`);
	}
}

/**
 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
 * @param {string} attr
 */
function get_attr_value(node, attr) {
	const attribute = node.attributes.find(
		/** @param {any} v */ (v) => v.type === 'Attribute' && v.name === attr
	);

	if (!attribute) return;

	return attribute.value[0];
}

/**
 * @param {string} content
 * @param {Array<import('svelte/types/compiler/interfaces').BaseDirective | import('svelte/types/compiler/interfaces').Attribute | import('svelte/types/compiler/interfaces').SpreadAttribute>} attributes
 * @param {{
 *   src: string,
 *   width: string | number,
 *   height: string | number
 * }} details
 */
function img_attributes_to_markdown(content, attributes, details) {
	const attribute_strings = attributes.map((attribute) => {
		if (attribute.name === 'src') {
			return `src=${details.src}`;
		}
		return content.substring(attribute.start, attribute.end);
	});

	/** @type {number | undefined} */
	let user_width;
	/** @type {number | undefined} */
	let user_height;
	for (const attribute of attributes) {
		if (attribute.name === 'width') user_width = parseInt(attribute.value[0]);
		if (attribute.name === 'height') user_height = parseInt(attribute.value[0]);
	}
	if (!user_width && !user_height) {
		attribute_strings.push(`width=${details.width}`);
		attribute_strings.push(`height=${details.height}`);
	} else if (!user_width && user_height) {
		attribute_strings.push(
			`width=${Math.round(
				(stringToNumber(details.width) * user_height) / stringToNumber(details.height)
			)}`
		);
	} else if (!user_height && user_width) {
		attribute_strings.push(
			`height=${Math.round(
				(stringToNumber(details.height) * user_width) / stringToNumber(details.width)
			)}`
		);
	}

	return attribute_strings.join(' ');
}

/**
 * @param {string|number} param
 */
function stringToNumber(param) {
	return typeof param === 'string' ? parseInt(param) : param;
}

/**
 * @param {string} content
 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
 * @param {import('vite-imagetools').Picture} image
 */
function img_to_picture(content, node, image) {
	/** @type {Array<import('svelte/types/compiler/interfaces').BaseDirective | import('svelte/types/compiler/interfaces').Attribute | import('svelte/types/compiler/interfaces').SpreadAttribute>} attributes */
	const attributes = node.attributes;
	const index = attributes.findIndex((attribute) => attribute.name === 'sizes');
	let sizes_string = '';
	if (index >= 0) {
		sizes_string = ' ' + content.substring(attributes[index].start, attributes[index].end);
		attributes.splice(index, 1);
	}

	let res = '<picture>';
	for (const [format, srcset] of Object.entries(image.sources)) {
		res += `<source srcset={"${srcset}"}${sizes_string} type="image/${format}" />`;
	}
	// Need to handle src differently when using either Vite's renderBuiltUrl or relative base path in Vite.
	// See https://github.com/vitejs/vite/blob/b93dfe3e08f56cafe2e549efd80285a12a3dc2f0/packages/vite/src/node/plugins/asset.ts#L132
	const src =
		image.img.src.startsWith('"+') && image.img.src.endsWith('+"')
			? `{"${image.img.src.substring(2, image.img.src.length - 2)}"}`
			: `"${image.img.src}"`;
	res += `<img ${img_attributes_to_markdown(content, attributes, {
		src,
		width: image.img.w,
		height: image.img.h
	})} />`;
	res += '</picture>';
	return res;
}

/**
 * For images like `<img src={manually_imported} />`
 * @param {string} content
 * @param {import('svelte/types/compiler/interfaces').TemplateNode} node
 * @param {string} src_var_name
 */
function dynamic_img_to_picture(content, node, src_var_name) {
	/** @type {Array<import('svelte/types/compiler/interfaces').BaseDirective | import('svelte/types/compiler/interfaces').Attribute | import('svelte/types/compiler/interfaces').SpreadAttribute>} attributes */
	const attributes = node.attributes;
	const index = attributes.findIndex((attribute) => attribute.name === 'sizes');
	let sizes_string = '';
	if (index >= 0) {
		sizes_string = ' ' + content.substring(attributes[index].start, attributes[index].end);
		attributes.splice(index, 1);
	}

	const details = {
		src: `{${src_var_name}.img.src}`,
		width: `{${src_var_name}.img.w}`,
		height: `{${src_var_name}.img.h}`
	};

	return `{#if typeof ${src_var_name} === 'string'}
	<img ${img_attributes_to_markdown(content, node.attributes, details)} />
{:else}
	<picture>
		{#each Object.entries(${src_var_name}.sources) as [format, srcset]}
			<source {srcset}${sizes_string} type={'image/' + format} />
		{/each}
		<img ${img_attributes_to_markdown(content, attributes, details)} />
	</picture>
{/if}`;
}
