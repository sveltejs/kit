import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { assert, expect, test, vi } from 'vitest';
import { validate_config, split_config, load_template } from './index.js';

/**
 * mutates and remove keys from an object when check callback returns true
 * @param {Record<string, any>} o any object
 * @param {([key, value]: [string, any]) => boolean} check callback with access
 * 		to the key-value pair and returns a boolean that decides the deletion of key
 */
function remove_keys(o, check) {
	for (const key in o) {
		if (!Object.hasOwnProperty.call(o, key)) continue;
		if (check([key, o[key]])) delete o[key];
		const nested = typeof o[key] === 'object' && !Array.isArray(o[key]);
		if (nested) remove_keys(o[key], check);
	}
}

/**
 * @param {() => void} fn
 * @param {string} code
 * @param {RegExp} pattern
 */
function assert_logs_error_and_throws(fn, code, pattern) {
	const original_log = console.log;
	/** @type {string[]} */
	const logs = [];
	console.log = (...args) => {
		logs.push(args.join(' '));
	};

	/** @type {unknown} */
	let thrown;
	try {
		fn();
	} catch (error) {
		thrown = error;
	} finally {
		console.log = original_log;
	}

	assert.instanceOf(thrown, Error);
	const error = /** @type {Error} */ (thrown);
	assert.equal(error.message, 'Failed to load SvelteKit options from Vite config');
	assert.equal(error.stack, '');

	const has_match = logs.some((log) => {
		const [logged_code, text, url, ...rest] = stripVTControlCharacters(log).trim().split('\n');
		return (
			logged_code === code &&
			pattern.test(text) &&
			url === `https://next.svelte.dev/e/@sveltejs/kit/${code}` &&
			rest.length === 0
		);
	});

	if (!has_match) {
		throw new Error(
			`Expected console.log to show ${code} matching ${pattern}, but got:\n${logs.map((log) => JSON.stringify(stripVTControlCharacters(log).trim())).join('\n')}`
		);
	}
}

const directive_defaults = {
	'child-src': undefined,
	'default-src': undefined,
	'frame-src': undefined,
	'worker-src': undefined,
	'connect-src': undefined,
	'font-src': undefined,
	'img-src': undefined,
	'manifest-src': undefined,
	'media-src': undefined,
	'object-src': undefined,
	'prefetch-src': undefined,
	'script-src': undefined,
	'script-src-elem': undefined,
	'script-src-attr': undefined,
	'style-src': undefined,
	'style-src-elem': undefined,
	'style-src-attr': undefined,
	'base-uri': undefined,
	sandbox: undefined,
	'form-action': undefined,
	'frame-ancestors': undefined,
	'navigate-to': undefined,
	'report-uri': undefined,
	'report-to': undefined,
	'require-trusted-types-for': undefined,
	'trusted-types': undefined,
	'upgrade-insecure-requests': false,
	'require-sri-for': undefined,
	'block-all-mixed-content': false,
	'plugin-types': undefined,
	referrer: undefined
};

const get_defaults = (prefix = '') => ({
	extensions: ['.svelte'],
	alias: {},
	appDir: '_app',
	csp: {
		mode: 'auto',
		directives: directive_defaults,
		reportOnly: directive_defaults
	},
	csrf: {
		checkOrigin: undefined,
		trustedOrigins: []
	},
	embedded: false,
	env: {
		dir: prefix
	},
	experimental: {
		remoteFunctions: false,
		forkPreloads: false
	},
	files: {
		src: join(prefix, 'src'),
		assets: join(prefix, 'static'),
		hooks: {
			client: join(prefix, 'src/hooks.client'),
			server: join(prefix, 'src/hooks.server'),
			universal: join(prefix, 'src/hooks')
		},
		params: join(prefix, 'src/params'),
		routes: join(prefix, 'src/routes'),
		serviceWorker: join(prefix, 'src/service-worker'),
		appTemplate: join(prefix, 'src/app.html'),
		errorTemplate: join(prefix, 'src/error.html')
	},
	inlineStyleThreshold: 0,
	moduleExtensions: ['.js', '.ts'],
	output: { bundleStrategy: 'split', preloadStrategy: undefined, linkHeaderPreload: false },
	outDir: join(prefix, '.svelte-kit'),
	router: {
		type: 'pathname',
		resolution: 'client'
	},
	serviceWorker: {
		options: undefined,
		register: true
	},
	tracing: { server: false },
	typescript: {},
	paths: {
		base: '',
		assets: '',
		origin: undefined,
		relative: true
	},
	prerender: {
		concurrency: 1,
		crawl: true,
		entries: ['*'],
		origin: undefined
	},
	version: {
		name: Date.now().toString(),
		pollInterval: 3_600_000
	}
});

test('fills in defaults', () => {
	const validated = validate_config({});

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const defaults = get_defaults();
	defaults.version.name = validated.version.name;

	expect(validated).toEqual(defaults);
});

test('errors on invalid values', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				appDir: 42
			});
		},
		'config_expected_string',
		/^`config\.appDir` should be a string, if specified$/
	);
});

test.each([-1, 0, 1.5, Infinity, NaN])(
	'errors on invalid prerender concurrency %s',
	(concurrency) => {
		assert_logs_error_and_throws(
			() => {
				validate_config({
					prerender: { concurrency }
				});
			},
			'config_expected_positive_integer',
			/^`config\.prerender\.concurrency` should be a positive integer, if specified$/
		);
	}
);

test('errors on invalid nested values', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				files: {
					// @ts-expect-error - given value expected to throw
					potato: 'blah'
				}
			});
		},
		'config_unexpected_option',
		/^Unexpected option `config\.files\.potato`$/
	);
});

test('does not error on invalid top-level values', () => {
	assert.doesNotThrow(() => {
		validate_config({
			onwarn: () => {}
		});
	});
});

test('errors on extension without leading .', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				extensions: ['blah']
			});
		},
		'config_extension_missing_dot',
		/Each member of config\.extensions must start with `'\.'` — saw `'blah'`/
	);
});

test('fills in partial blanks', () => {
	const validated = validate_config({
		files: {
			assets: 'public'
		},
		version: {
			name: '0'
		}
	});

	remove_keys(validated, ([, v]) => typeof v === 'function');

	const config = get_defaults();
	config.files.assets = 'public';
	config.version.name = '0';

	expect(validated).toEqual(config);
});

test('fails if appDir is blank', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				appDir: ''
			});
		},
		'config_empty_string',
		/^`config\.appDir` cannot be empty$/
	);
});

test('fails if appDir is only slash', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				appDir: '/'
			});
		},
		'config_app_dir_slash',
		/^`config\.appDir` cannot start or end with `'\/'`$/
	);
});

test('fails if appDir starts with slash', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				appDir: '/_app'
			});
		},
		'config_app_dir_slash',
		/^`config\.appDir` cannot start or end with `'\/'`$/
	);
});

test('fails if appDir ends with slash', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				appDir: '_app/'
			});
		},
		'config_app_dir_slash',
		/^`config\.appDir` cannot start or end with `'\/'`$/
	);
});

test('fails if paths.base is not root-relative', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					// @ts-expect-error
					base: 'https://example.com/somewhere/else'
				}
			});
		},
		'config_paths_base_invalid',
		/^`config\.paths\.base` option must either be the empty string or a root-relative path that starts but doesn't end with `'\/'`$/
	);
});

test("fails if paths.base ends with '/'", () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					base: '/github-pages/'
				}
			});
		},
		'config_paths_base_invalid',
		/^`config\.paths\.base` option must either be the empty string or a root-relative path that starts but doesn't end with `'\/'`$/
	);
});

test('does not require svelte-trusted-html when trusted types are enforced', () => {
	assert.doesNotThrow(() => {
		validate_config({
			csp: {
				directives: {
					'require-trusted-types-for': ['script']
				}
			}
		});
	});
});

test('fails if paths.assets is relative', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					// @ts-expect-error
					assets: 'foo'
				}
			});
		},
		'config_paths_assets_not_absolute',
		/^`config\.paths\.assets` option must be an absolute path, if specified$/
	);
});

test('fails if paths.assets has trailing slash', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					assets: 'https://cdn.example.com/stuff/'
				}
			});
		},
		'config_paths_assets_trailing_slash',
		/^`config\.paths\.assets` option must not end with `'\/'`$/
	);
});

test('fails if paths.origin is not a valid origin', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					origin: 'not an origin'
				}
			});
		},
		'config_origin_invalid',
		/^`config.paths.origin` must be a valid origin \(e\.g\. 'https:\/\/my-site\.com'\)\. `'not an origin'` could not be parsed as a URL$/
	);
});

test('fails if paths.origin uses an unsupported protocol', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					// ftp:// is a parseable URL whose origin equals the input, so without
					// a protocol check it would slip through validation.
					origin: 'ftp://example.com'
				}
			});
		},
		'config_origin_protocol',
		/^`config.paths.origin` must be a valid origin — only 'http' and 'https' protocols are supported, received 'ftp:'$/
	);
});

test('fails if paths.origin contains a path', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					origin: 'https://example.com/path'
				}
			});
		},
		'config_origin_has_path',
		/^`config.paths.origin` must be a valid origin — received `'https:\/\/example\.com\/path'` which contains a path, query, or hash\. Use the bare origin `'https:\/\/example\.com'` instead$/
	);
});

test('passes if paths.origin is a valid origin', () => {
	const validated = validate_config({
		paths: {
			origin: 'https://example.com'
		}
	});
	assert.equal(validated.paths.origin, 'https://example.com');
});

test('defaults paths.origin to undefined', () => {
	const validated = validate_config({});
	assert.equal(validated.paths.origin, undefined);
});

test('fails if paths.origin is the empty string', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				paths: {
					origin: ''
				}
			});
		},
		'config_origin_invalid',
		/^`config.paths.origin` must be a valid origin \(e\.g\. 'https:\/\/my-site\.com'\)\. `''` could not be parsed as a URL$/
	);
});

test('fails if prerender.entries are invalid', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				prerender: {
					// @ts-expect-error - given value expected to throw
					entries: ['foo']
				}
			});
		},
		'config_prerender_entry_invalid',
		/^Each member of `config.prerender.entries` must be either `'\*'` or an absolute path beginning with `'\/'` — saw `'foo'`$/
	);
});

test('fails if prerender.origin is set', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				prerender: {
					// @ts-expect-error - option has been removed
					origin: 'https://example.com'
				}
			});
		},
		'config_option_removed_prerender_origin',
		/^`config.prerender.origin` has been removed in favour of `config.paths.origin`$/
	);
});

/**
 * @param {string} name
 * @param {import('@sveltejs/kit/vite').Config['paths']} input
 * @param {import('@sveltejs/kit/vite').Config['paths']} output
 */
function validate_paths(name, input, output) {
	test(name, () => {
		expect(
			validate_config({
				paths: input
			}).paths
		).toEqual(output);
	});
}

validate_paths(
	'empty assets relative to base path',
	{
		base: '/path/to/base'
	},
	{
		base: '/path/to/base',
		assets: '',
		origin: undefined,
		relative: true
	}
);

validate_paths(
	'external assets',
	{
		assets: 'https://cdn.example.com'
	},
	{
		base: '',
		assets: 'https://cdn.example.com',
		origin: undefined,
		relative: true
	}
);

validate_paths(
	'external assets with base',
	{
		base: '/path/to/base',
		assets: 'https://cdn.example.com'
	},
	{
		base: '/path/to/base',
		assets: 'https://cdn.example.com',
		origin: undefined,
		relative: true
	}
);

test('accepts valid tracing values', () => {
	assert.doesNotThrow(() => {
		validate_config({
			tracing: { server: true }
		});
	});

	assert.doesNotThrow(() => {
		validate_config({
			tracing: { server: false }
		});
	});

	assert.doesNotThrow(() => {
		validate_config({
			tracing: undefined
		});
	});
});

test('errors on invalid tracing values', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				tracing: true
			});
		},
		'config_expected_object',
		/^`config\.tracing` should be an object$/
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				tracing: 'server'
			});
		},
		'config_expected_object',
		/^`config\.tracing` should be an object$/
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				tracing: { server: 'invalid' }
			});
		},
		'config_expected_boolean',
		/^`config\.tracing\.server` should be true or false, if specified$/
	);
});

test('errors on removed experimental.tracing and experimental.instrumentation', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				experimental: {
					// @ts-expect-error - removed option expected to throw
					tracing: { server: true }
				}
			});
		},
		'config_option_removed_experimental_tracing',
		/`config\.experimental\.tracing` has been removed/
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				experimental: {
					// @ts-expect-error - removed option expected to throw
					instrumentation: { server: true }
				}
			});
		},
		'config_option_removed_experimental_instrumentation',
		/`config\.experimental\.instrumentation` has been removed/
	);
});

test('errors on invalid forkPreloads values', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				experimental: {
					// @ts-expect-error - given value expected to throw
					forkPreloads: 'true'
				}
			});
		},
		'config_expected_boolean',
		/^`config\.experimental\.forkPreloads` should be true or false, if specified$/
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				experimental: {
					// @ts-expect-error - given value expected to throw
					forkPreloads: 1
				}
			});
		},
		'config_expected_boolean',
		/^`config\.experimental\.forkPreloads` should be true or false, if specified$/
	);
});

test('errors on removed vitePlugin namespace', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - removed option expected to throw
				vitePlugin: { inspector: true }
			});
		},
		'config_option_removed_vite_plugin',
		/`config\.vitePlugin` has been removed/
	);
});

test('errors on the removed kit namespace, listing its keys', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - removed option expected to throw
				kit: { appDir: '_app', paths: {} }
			});
		},
		'config_kit_namespace',
		/^SvelteKit configuration \(`appDir`, `paths`\) no longer lives inside a `kit` namespace/
	);
});

test('lists allowed values for invalid options', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				router: { type: 'query' }
			});
		},
		'config_expected_one_of',
		/^`config\.router\.type` should be either "pathname" or "hash"$/
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				csp: { mode: 'strict' }
			});
		},
		'config_expected_one_of',
		/^`config\.csp\.mode` should be one of "auto", "hash" or "nonce"$/
	);
});

test('errors if server-side route resolution is combined with hash routing', () => {
	assert_logs_error_and_throws(
		() => {
			validate_config({ router: { type: 'hash', resolution: 'server' } });
		},
		'config_server_resolution_hash',
		/^The `router\.resolution` option cannot be `'server'` if `router\.type` is `'hash'`$/
	);
});

test('warns about deprecated options and still validates them', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	try {
		const validated = validate_config({ alias: { $utils: 'src/utils' } });
		assert.deepEqual(validated.alias, { $utils: 'src/utils' });

		expect(warn).toHaveBeenCalledOnce();
		const code = 'config_option_deprecated_alias';
		assert.equal(
			stripVTControlCharacters(warn.mock.calls[0][0]),
			`${code}\nThe \`config.alias\` option is deprecated, and will be removed in a future version of SvelteKit. Use subpath imports instead: https://svelte.dev/docs/kit/$lib\nhttps://next.svelte.dev/e/@sveltejs/kit/${code}`
		);

		assert_logs_error_and_throws(
			() => {
				// @ts-expect-error - given value expected to throw
				validate_config({ alias: { $utils: 42 } });
			},
			'config_expected_string',
			/^`config\.alias\.\$utils` should be a string, if specified$/
		);
	} finally {
		warn.mockRestore();
	}
});

test('split_config keeps SvelteKit options under the `kit` namespace', () => {
	const adapter = { name: 'test', adapt: () => {} };
	const { svelte_config, vite_plugin_svelte_config } = split_config({
		adapter,
		paths: { base: '/base' },
		router: { type: 'hash' }
	});

	expect(svelte_config).toEqual({
		adapter,
		paths: { base: '/base' },
		router: { type: 'hash' }
	});
	expect(vite_plugin_svelte_config).toEqual({});
});

test('split_config forwards unknown (vite-plugin-svelte) options', () => {
	const dynamicCompileOptions = () => {};
	const { svelte_config, vite_plugin_svelte_config } = split_config({
		paths: { base: '/base' },
		inspector: true,
		dynamicCompileOptions
	});

	expect(svelte_config).toEqual({ paths: { base: '/base' } });
	expect(vite_plugin_svelte_config).toEqual({ inspector: true, dynamicCompileOptions });
});

test('split_config keeps Svelte-level options out of the `kit` namespace', () => {
	const preprocess = { markup: () => ({ code: '' }) };
	const { svelte_config, vite_plugin_svelte_config } = split_config({
		extensions: ['.svelte', '.svx'],
		compilerOptions: { runes: true },
		preprocess,
		inspector: true
	});

	expect(svelte_config.extensions).toEqual(['.svelte', '.svx']);
	expect(svelte_config.compilerOptions).toEqual({ runes: true });
	expect(svelte_config.preprocess).toBe(preprocess);
	expect(svelte_config.inspector).toEqual(undefined);
	expect(vite_plugin_svelte_config).toEqual({ inspector: true });
});

test('split_config splits the shadowed `experimental` namespace', () => {
	const { svelte_config, vite_plugin_svelte_config } = split_config({
		experimental: /** @type {any} */ ({
			remoteFunctions: true,
			sendWarningsToBrowser: true
		})
	});

	expect(svelte_config.experimental).toEqual({ remoteFunctions: true });
	expect(vite_plugin_svelte_config).toEqual({ experimental: { sendWarningsToBrowser: true } });
});

test('split_config only sets `experimental` when SvelteKit flags are present', () => {
	const { svelte_config, vite_plugin_svelte_config } = split_config({
		experimental: /** @type {any} */ ({
			sendWarningsToBrowser: true
		})
	});

	expect(svelte_config).toEqual({});
	expect(vite_plugin_svelte_config).toEqual({ experimental: { sendWarningsToBrowser: true } });
});

/**
 * @param {(cwd: string) => void} fn
 */
function with_temp_dir(fn) {
	const cwd = fs.mkdtempSync(join(tmpdir(), 'kit-load-template-'));
	try {
		fn(cwd);
	} finally {
		fs.rmSync(cwd, { recursive: true, force: true });
	}
}

/**
 * @param {string} cwd
 */
function template_config(cwd) {
	return validate_config({ files: { appTemplate: join(cwd, 'src/app.html') } });
}

/**
 * @param {() => void} fn
 * @param {string} code
 * @param {string} text
 */
function assert_diagnostic(fn, code, text) {
	/** @type {unknown} */
	let thrown;
	try {
		fn();
	} catch (error) {
		thrown = error;
	}

	assert.instanceOf(thrown, Error);
	const error = /** @type {Error} */ (thrown);
	assert.equal(Object.getPrototypeOf(error), Error.prototype);
	assert.equal(error.name, 'SvelteKit error');
	assert.equal(error.message, `${code}\n${text}\nhttps://next.svelte.dev/e/@sveltejs/kit/${code}`);
	return error;
}

const valid_template = '<html><head>%sveltekit.head%</head><body>%sveltekit.body%</body></html>';

test('load_template errors if the app template does not exist', () => {
	with_temp_dir((cwd) => {
		const error = assert_diagnostic(
			() => load_template(cwd, template_config(cwd)),
			'app_template_missing',
			`${join('src', 'app.html')} does not exist`
		);

		// the generated helper and the shared thrower are omitted from the stack
		const frames = /** @type {string} */ (error.stack)
			.split('\n')
			.filter((line) => /^\s+at /.test(line));
		assert.match(frames[0], /\bload_template\b/);
		assert.notMatch(/** @type {string} */ (error.stack), /app_template_missing \(|throw_error/);
	});
});

test.each(['%sveltekit.head%', '%sveltekit.body%'])(
	'load_template errors if the app template is missing %s',
	(tag) => {
		with_temp_dir((cwd) => {
			fs.mkdirSync(join(cwd, 'src'));
			fs.writeFileSync(join(cwd, 'src/app.html'), valid_template.replace(tag, ''));

			assert_diagnostic(
				() => load_template(cwd, template_config(cwd)),
				'app_template_tag_missing',
				`${join('src', 'app.html')} is missing \`${tag}\``
			);
		});
	}
);

test('load_template returns a valid app template unchanged', () => {
	with_temp_dir((cwd) => {
		fs.mkdirSync(join(cwd, 'src'));
		fs.writeFileSync(join(cwd, 'src/app.html'), valid_template);

		assert.equal(load_template(cwd, template_config(cwd)), valid_template);
	});
});
