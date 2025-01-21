import { assert, test } from 'vitest';
import { module_guard } from './index.js';

/**
 *
 * @param {Record<string, { importedIds?: string[]; dynamicallyImportedIds?: string[] }>} graph
 * @param {string} [expected_error]
 */
function check(graph, expected_error) {
	// @ts-expect-error
	const context = /** @type {import('vite').Rollup.PluginContext} */ ({
		/** @param {string} id */
		getModuleInfo(id) {
			return {
				importedIds: [],
				dynamicallyImportedIds: [],
				...graph[id]
			};
		}
	});

	const guard = module_guard(context, {
		cwd: '~',
		lib: '~/src/lib'
	});

	if (expected_error) {
		try {
			guard.check('~/src/entry');
			throw new Error('Expected an error');
		} catch (e) {
			// @ts-expect-error
			assert.equal(e.message, expected_error.replace(/^\t+/gm, ''));
		}
	} else {
		guard.check('~/src/entry');
	}
}

test('throws an error when importing $env/static/private', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				importedIds: ['\0virtual:$env/static/private']
			}
		},
		`Cannot import $env/static/private into client-side code:
		- src/routes/+page.svelte imports
		 - $env/static/private`
	);
});

test('throws an error when dynamically importing $env/static/private', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				dynamicallyImportedIds: ['\0virtual:$env/static/private']
			}
		},
		`Cannot import $env/static/private into client-side code:
		- src/routes/+page.svelte dynamically imports
		 - $env/static/private`
	);
});

test('throws an error when importing $env/dynamic/private', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				importedIds: ['\0virtual:$env/dynamic/private']
			}
		},
		`Cannot import $env/dynamic/private into client-side code:
		- src/routes/+page.svelte imports
		 - $env/dynamic/private`
	);
});

test('throws an error when dynamically importing $env/dynamic/private', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				dynamicallyImportedIds: ['\0virtual:$env/dynamic/private']
			}
		},
		`Cannot import $env/dynamic/private into client-side code:
		- src/routes/+page.svelte dynamically imports
		 - $env/dynamic/private`
	);
});

test('throws an error when importing a .server.js module', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				importedIds: ['~/src/routes/illegal.server.js']
			},
			'~/src/routes/illegal.server.js': {}
		},
		`Cannot import src/routes/illegal.server.js into client-side code:
		- src/routes/+page.svelte imports
		 - src/routes/illegal.server.js`
	);
});

test('throws an error when importing a $lib/server/**/*.js module', () => {
	check(
		{
			'~/src/entry': {
				importedIds: ['~/src/routes/+page.svelte']
			},
			'~/src/routes/+page.svelte': {
				importedIds: ['~/src/lib/server/some/module.js']
			},
			'~/src/lib/server/some/module.js': {}
		},
		`Cannot import $lib/server/some/module.js into client-side code:
		- src/routes/+page.svelte imports
		 - $lib/server/some/module.js`
	);
});

test('ignores .server.js files in node_modules', () => {
	check({
		'~/src/entry': {
			importedIds: ['~/src/routes/+page.svelte']
		},
		'~/src/routes/+page.svelte': {
			importedIds: ['~/node_modules/illegal.server.js']
		},
		'~/node_modules/illegal.server.js': {}
	});
});

test('ignores .server.js files outside the project root', () => {
	check({
		'~/src/entry': {
			importedIds: ['~/src/routes/+page.svelte']
		},
		'~/src/routes/+page.svelte': {
			importedIds: ['/illegal.server.js']
		},
		'/illegal.server.js': {}
	});
});
