const inject_styles = `
export default function(files) {
	return Promise.all(files.map(function(file) { return new Promise(function(fulfil, reject) {
		var href = new URL(file, import.meta.url);
		var baseURI = document.baseURI;
		if (!baseURI) {
			var baseTags = document.getElementsByTagName('base');
			baseURI = baseTags.length ? baseTags[0].href : document.URL;
		}
		var relative = ('' + href).substring(baseURI.length);
		var link = document.querySelector('link[rel=stylesheet][href="' + relative + '"]')
			|| document.querySelector('link[rel=stylesheet][href="' + href + '"]');
		if (!link) {
			link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = href;
			document.head.appendChild(link);
		}
		if (link.sheet) {
			fulfil();
		} else {
			link.onload = function() { return fulfil() };
			link.onerror = reject;
		}
	})}));
};`.trim();

const INJECT_STYLES_NAME = 'inject_styles';
const INJECT_STYLES_ID = 'inject_styles.js';

const find_css = (chunk, bundle) => {
	const css_files = new Set();
	const visited = new Set();

	const recurse = (c) => {
		if (visited.has(c)) return;
		visited.add(c);

		if (c.imports) {
			c.imports.forEach((file) => {
				if (file.endsWith('.css')) {
					css_files.add(file);
				} else {
					const imported_chunk = bundle[file];
					if (imported_chunk) {
						recurse(imported_chunk);
					}
				}
			});
		}
	};

	recurse(chunk);
	return Array.from(css_files);
};

export const css_injection = {
	name: 'svelte-css-injection',
	buildStart() {
		this.emitFile({
			type: 'chunk',
			id: INJECT_STYLES_ID,
			name: INJECT_STYLES_NAME,
			preserveSignature: 'allow-extension'
		});
	},
	load(id) {
		return id === INJECT_STYLES_ID ? inject_styles : null;
	},
	resolveId(importee) {
		return importee === INJECT_STYLES_ID ? INJECT_STYLES_ID : null;
	},
	renderDynamicImport({ targetModuleId }) {
		if (targetModuleId) {
			const t = Buffer.from(targetModuleId).toString('hex');
			return {
				left: 'Promise.all([import(',
				right: `), ___SVELTE_CSS_INJECTION___${t}___]).then(function(x) { return x[0]; })`
			};
		} else {
			return {
				left: 'import(',
				right: ')'
			};
		}
	},
	async generateBundle(_options, bundle) {
		const inject_styles_file = Object.keys(bundle).find((f) => f.startsWith('inject_styles'));

		let has_css = false;
		for (const name in bundle) {
			const chunk = bundle[name];

			let chunk_has_css = false;

			if (chunk.code) {
				chunk.code = chunk.code.replace(/___SVELTE_CSS_INJECTION___([0-9a-f]+)___/g, (_m, id) => {
					id = Buffer.from(id, 'hex').toString();
					const target = Object.values(bundle).find((c) => c.modules && c.modules[id]);

					if (target) {
						const css_files = find_css(target, bundle);
						if (css_files.length > 0) {
							chunk_has_css = true;
							return `__inject_styles(${JSON.stringify(css_files)})`;
						}
					}

					return '';
				});

				if (chunk_has_css) {
					has_css = true;
					chunk.code += `\nimport __inject_styles from './${inject_styles_file}';`;
				}
			}
		}

		if (!has_css) {
			delete bundle[inject_styles_file];
		}
	}
};
