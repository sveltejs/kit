import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
 * Asserts that `fn` logs the diagnostic with the given code and then throws a stackless summary
 * @param {() => void} fn
 * @param {string} code
 * @param {Array<string | RegExp>} [contains] parts of the text computed from the config
 */
function assert_logs_error_and_throws(fn, code, contains) {
	const log = vi.spyOn(console, 'log').mockImplementation(() => {});

	try {
		expect(fn).toThrow(
			expect.objectContaining({
				message: 'Failed to load SvelteKit options from Vite config',
				stack: ''
			})
		);
		expect(log).toContainKitDiagnostic(code, { contains });
	} finally {
		log.mockRestore();
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
		['config.appDir']
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
			['config.prerender.concurrency']
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
		['config.files.potato']
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
		["'blah'"]
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
		['config.appDir']
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
		['config.appDir']
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
		['config.appDir']
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
		['config.appDir']
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
		['config.paths.base']
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
		['config.paths.base']
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
		['config.paths.assets']
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
		['config.paths.assets']
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
		["'not an origin'"]
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
		["'ftp:'"]
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
		["'https://example.com/path'", "'https://example.com'"]
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
		["''"]
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
		["'foo'"]
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
		['`config.prerender.origin`']
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
		['config.tracing']
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				tracing: 'server'
			});
		},
		'config_expected_object',
		['config.tracing']
	);

	assert_logs_error_and_throws(
		() => {
			validate_config({
				// @ts-expect-error - given value expected to throw
				tracing: { server: 'invalid' }
			});
		},
		'config_expected_boolean',
		['config.tracing.server']
	);
});

test.each(['tracing', 'instrumentation'])('errors on removed experimental.%s', (key) => {
	assert_logs_error_and_throws(
		() => validate_config({ experimental: /** @type {any} */ ({ [key]: { server: true } }) }),
		`config_option_removed_experimental_${key}`
	);
});

test.each(['true', 1])('errors on invalid forkPreloads value %j', (value) => {
	assert_logs_error_and_throws(
		() => validate_config({ experimental: { forkPreloads: /** @type {any} */ (value) } }),
		'config_expected_boolean',
		['config.experimental.forkPreloads']
	);
});

test('errors on removed vitePlugin namespace', () => {
	assert_logs_error_and_throws(() => {
		validate_config({
			// @ts-expect-error - removed option expected to throw
			vitePlugin: { inspector: true }
		});
	}, 'config_option_removed_vite_plugin');
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
		['(`appDir`, `paths`)']
	);
});

test.each([
	[{ router: { type: 'query' } }, ['config.router.type', '"pathname" or "hash"']],
	[{ csp: { mode: 'strict' } }, ['config.csp.mode', '"auto", "hash" or "nonce"']]
])('lists allowed values for invalid option %j', (config, contains) => {
	assert_logs_error_and_throws(
		() => validate_config(/** @type {any} */ (config)),
		'config_expected_one_of',
		contains
	);
});

test('errors if server-side route resolution is combined with hash routing', () => {
	assert_logs_error_and_throws(() => {
		validate_config({ router: { type: 'hash', resolution: 'server' } });
	}, 'config_server_resolution_hash');
});

test('warns about deprecated options and still validates them', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

	try {
		const validated = validate_config({ alias: { $utils: 'src/utils' } });
		assert.deepEqual(validated.alias, { $utils: 'src/utils' });

		expect(warn).toHaveBeenCalledOnce();
		expect(warn).toContainKitDiagnostic('config_option_deprecated_alias', {
			contains: ['`config.alias`']
		});

		assert_logs_error_and_throws(
			() => {
				// @ts-expect-error - given value expected to throw
				validate_config({ alias: { $utils: 42 } });
			},
			'config_expected_string',
			['config.alias.$utils']
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

const valid_template = '<html><head>%sveltekit.head%</head><body>%sveltekit.body%</body></html>';

test('load_template errors if the app template does not exist', () => {
	with_temp_dir((cwd) => {
		/** @type {any} */
		let error;
		try {
			load_template(cwd, template_config(cwd));
		} catch (e) {
			error = e;
		}

		expect(error).toBeKitError('app_template_missing', { contains: [join('src', 'app.html')] });

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

			expect(() => load_template(cwd, template_config(cwd))).toThrowKitError(
				'app_template_tag_missing',
				{ contains: [join('src', 'app.html'), tag] }
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
