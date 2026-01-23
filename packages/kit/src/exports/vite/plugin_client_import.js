import fs from 'node:fs';
import path from 'node:path';
import { normalizePath } from 'vite';
import { hash } from '../../utils/hash.js';
import { posixify, mkdirp } from '../../utils/filesystem.js';
import { s } from '../../utils/misc.js';

/**
 * Convert a file path to a dev server URL that matches Vite's asset plugin behavior
 * @param {string} file_path - Absolute file path
 * @param {string} root - Project root path
 * @param {string} base - Base URL
 * @returns {string}
 */
function file_to_dev_url(file_path, root, base) {
	const normalized_file = normalizePath(file_path);
	const normalized_root = normalizePath(root);

	let url;
	if (normalized_file.startsWith(normalized_root + '/')) {
		// File is inside project root - use relative path
		url = '/' + path.posix.relative(normalized_root, normalized_file);
	} else {
		// File is outside project root - use /@fs/ prefix
		url = '/@fs/' + normalized_file;
	}

	// Join with base URL
	if (base && base !== '/') {
		return base.replace(/\/$/, '') + url;
	}

	return url;
}

const CLIENT_IMPORT_QUERY = /(\?|&)client-import(?:&|$)/;
const VIRTUAL_PREFIX = '\0sveltekit-client-import:';

/**
 * Creates a plugin that handles client imports from server code.
 * When a module is imported with ?client-import in server code:
 * 1. It's replaced with a stub that will be resolved later
 * 2. The import is tracked for the client build
 * 3. After client build, the stub is updated with the actual client path
 *
 * @param {{
 *   kit: import('types').ValidatedKitConfig,
 *   out: string,
 *   cwd: string
 * }} options
 * @returns {{
 *   plugin: import('vite').Plugin,
 *   get_client_imports: () => Map<string, { file: string, hash: string, id: string, original_specifier: string }>,
 *   get_client_build_inputs: () => Record<string, string>,
 *   write_client_import_manifest: (client_manifest: import('vite').Manifest) => void
 * }}
 */
export function create_client_import_plugin({ kit: _kit, out, cwd }) {
	/** @type {Map<string, { file: string, hash: string, id: string, original_specifier: string }>} */
	const client_imports = new Map();

	/** @type {Set<string>} */
	const emitted_hashes = new Set();

	/** @type {import('vite').ViteDevServer | undefined} */
	let dev_server;
	let is_build = false;
	/** @type {import('vite').ResolvedConfig} */
	let resolved_config;

	/** @type {import('vite').Plugin} */
	const plugin = {
		name: 'vite-plugin-sveltekit-client-import',
		enforce: 'pre',

		/**
		 * @param {import('vite').ResolvedConfig} config
		 */
		configResolved(config) {
			is_build = config.command === 'build';
			resolved_config = config;
		},

		/**
		 * Resolve virtual modules for client imports
		 * @param {string} id
		 * @param {string | undefined} importer
		 * @param {object} [options]
		 * @param {boolean} [options.ssr]
		 */
		resolveId(id, importer, options) {
			// Handle virtual stub modules
			if (id.startsWith(VIRTUAL_PREFIX)) {
				return id;
			}

			// Handle ?client-import queries
			if (CLIENT_IMPORT_QUERY.test(id)) {
				// Remove the client-import query parameter while preserving other params
				let clean_id = id.replace(CLIENT_IMPORT_QUERY, (match, prefix) => {
					// If it was the first param (?client-import&...), keep the ?
					if (prefix === '?' && match.endsWith('&')) {
						return '?';
					}
					// If it's in the middle (&client-import&...), keep one &
					if (prefix === '&' && match.endsWith('&')) {
						return '&';
					}
					// If it's the last param (&client-import), remove it entirely
					return '';
				});
				// Clean up any trailing ? or &
				clean_id = clean_id.replace(/[?&]$/, '');
				// Save the original specifier before resolution (e.g., $lib/Component.svelte)
				const original_specifier = clean_id;

				// Let Vite resolve the actual module first
				return this.resolve(clean_id, importer, { skipSelf: true, ...options }).then((resolved) => {
					if (!resolved) {
						return null;
					}

					const file = posixify(path.relative(cwd, resolved.id));
					const hash_id = hash(file);

					// Track this import if not already tracked
					if (!client_imports.has(hash_id)) {
						client_imports.set(hash_id, {
							file: resolved.id,
							hash: hash_id,
							id: normalizePath(resolved.id),
							original_specifier
						});
					}

					// In SSR context, return a virtual module to avoid other plugins processing it
					if (options?.ssr) {
						// Return virtual module that won't be caught by Svelte plugin
						return `${VIRTUAL_PREFIX}stub:${hash_id}`;
					}

					// In non-SSR context, strip the query and return the resolved module
					// (behave as if the query parameter wasn't there)
					return resolved;
				});
			}
		},

		/**
		 * Handle loading of client import modules
		 * @param {string} id
		 * @param {object} [_options]
		 * @param {boolean} [_options.ssr]
		 */
		load(id, _options) {
			// Handle virtual stub modules (SSR imports that return client paths)
			if (id.startsWith(`${VIRTUAL_PREFIX}stub:`)) {
				const hash_id = id.slice(`${VIRTUAL_PREFIX}stub:`.length);
				const import_info = client_imports.get(hash_id);

				if (!import_info) {
					// Track this import if not already tracked
					// This can happen when resolveId is called before load
					const matched = [...client_imports.values()].find((info) => info.hash === hash_id);
					if (matched) {
						// Use existing info
					} else {
						throw new Error(`Expected to find metadata for client import ${hash_id}`);
					}
				}

				// Emit a chunk for the actual client module
				if (!emitted_hashes.has(hash_id)) {
					if (is_build && import_info) {
						this.emitFile({
							type: 'chunk',
							id: `${VIRTUAL_PREFIX}${hash_id}`,
							name: `client-import-${hash_id}`
						});
					}
					emitted_hashes.add(hash_id);
				}

				// In production, return stub that will be replaced after client build
				if (!dev_server) {
					return `export default '__CLIENT_IMPORT_PLACEHOLDER_${hash_id}__';`;
				}

				// In dev, return a URL that the browser can import
				const info = client_imports.get(hash_id);
				if (info) {
					const dev_url = file_to_dev_url(info.file, resolved_config.root, resolved_config.base);
					return `export default '${dev_url}';`;
				}

				return `export default '';`;
			}

			// Handle virtual chunk modules (client imports)
			if (id.startsWith(VIRTUAL_PREFIX) && !id.startsWith(`${VIRTUAL_PREFIX}stub:`)) {
				const hash_id = id.slice(VIRTUAL_PREFIX.length);
				const import_info = client_imports.get(hash_id);

				if (!import_info) {
					throw new Error(`Expected to find metadata for client import ${hash_id}`);
				}

				// In production, return stub that will be replaced after client build
				if (!dev_server) {
					return `export default '__CLIENT_IMPORT_PLACEHOLDER_${hash_id}__';`;
				}

				// In dev, return a URL that the browser can import
				const dev_url = file_to_dev_url(
					import_info.file,
					resolved_config.root,
					resolved_config.base
				);
				return `export default '${dev_url}';`;
			}

			// Handle ?client-import queries in client context
			// (In SSR context, these are resolved to virtual modules by resolveId)
			if (CLIENT_IMPORT_QUERY.test(id)) {
				// In client context, just return the actual module
				return null; // Let normal resolution happen
			}
		},

		/**
		 * @param {import('vite').ViteDevServer} _dev_server
		 */
		configureServer(_dev_server) {
			dev_server = _dev_server;
		}
	};

	/**
	 * Get all tracked client imports
	 */
	function get_client_imports() {
		return client_imports;
	}

	/**
	 * Get additional inputs for the client build
	 * @returns {Record<string, string>}
	 */
	function get_client_build_inputs() {
		/** @type {Record<string, string>} */
		const additional_inputs = {};

		// Add all tracked client imports as entrypoints
		for (const [hash_id, import_info] of client_imports) {
			additional_inputs[`client-imports/${hash_id}`] = import_info.file;
		}

		return additional_inputs;
	}

	/**
	 * After client build completes, write the manifest mapping client imports
	 * to their actual chunk paths
	 * @param {import('vite').Manifest} client_manifest
	 */
	function write_client_import_manifest(client_manifest) {
		mkdirp(`${out}/server/client-imports`);
		mkdirp(`${out}/client/_app/immutable/client-imports`);

		/** @type {Record<string, string>} */
		const manifest = {};

		for (const [hash_id, import_info] of client_imports) {
			// Find the entry in the client manifest
			const normalized_file = normalizePath(path.relative('.', import_info.file));

			// The chunk might be under the generated client-imports path
			const entry_key = Object.keys(client_manifest).find((key) => {
				return (
					key === normalized_file ||
					key.endsWith(`client-imports/${hash_id}.js`) ||
					client_manifest[key]?.name === `client-import-${hash_id}`
				);
			});

			if (entry_key) {
				const chunk = client_manifest[entry_key];
				const js_path = `/${chunk.file}`;
				const css_paths = (chunk.css || []).map((css) => `/${css}`);

				// Create a wrapper module that imports the component and injects CSS
				const wrapper_name = `${hash_id}-wrapper.js`;
				const wrapper_path = `${out}/client/_app/immutable/client-imports/${wrapper_name}`;

				let wrapper_code = '';

				// Add CSS injection code if there are CSS files
				if (css_paths.length > 0) {
					wrapper_code += '// Inject CSS\n';
					for (const css_path of css_paths) {
						wrapper_code += `if (!document.querySelector('link[href="${css_path}"]')) {\n`;
						wrapper_code += `  const link = document.createElement('link');\n`;
						wrapper_code += `  link.rel = 'stylesheet';\n`;
						wrapper_code += `  link.href = '${css_path}';\n`;
						wrapper_code += `  document.head.appendChild(link);\n`;
						wrapper_code += `}\n`;
					}
					wrapper_code += '\n';
				}

				// Re-export the component
				wrapper_code += `export { default } from '${js_path}';\n`;

				fs.writeFileSync(wrapper_path, wrapper_code);

				// Use the wrapper in the manifest
				manifest[hash_id] = `/_app/immutable/client-imports/${wrapper_name}`;
			} else {
				console.warn(`Warning: Could not find client chunk for client import ${import_info.file}`);
			}
		}

		// Write the manifest
		const manifest_code = `export const client_imports = ${s(manifest, null, '\t')};`;
		fs.writeFileSync(`${out}/server/client-imports/manifest.js`, manifest_code);

		// Update any placeholder stubs in the server output
		if (Object.keys(manifest).length > 0) {
			update_server_placeholders(out, manifest);
		}
	}

	return {
		plugin,
		get_client_imports,
		get_client_build_inputs,
		write_client_import_manifest
	};
}

/**
 * Replace placeholders in server build with actual client paths
 * @param {string} out
 * @param {Record<string, string>} manifest
 */
function update_server_placeholders(out, manifest) {
	const server_dir = `${out}/server`;

	if (!fs.existsSync(server_dir)) {
		return;
	}

	/**
	 * @param {string} dir
	 */
	function process_directory(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const full_path = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				process_directory(full_path);
			} else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
				let content = fs.readFileSync(full_path, 'utf-8');
				let modified = false;

				for (const [hash_id, client_path] of Object.entries(manifest)) {
					const placeholder = `__CLIENT_IMPORT_PLACEHOLDER_${hash_id}__`;
					if (content.includes(placeholder)) {
						content = content.replaceAll(placeholder, client_path);
						modified = true;
					}
				}

				if (modified) {
					fs.writeFileSync(full_path, content);
				}
			}
		}
	}

	process_directory(server_dir);
}
