import { describe } from '../../../utils/unit_test.js';
import * as assert from 'uvu/assert';
import { IllegalModuleGuard } from './index.js';
import path from 'path';
import { normalizePath } from 'vite';

const CWD = process.cwd();
const FAKE_LIB_DIR = normalizePath(path.join(CWD, 'lib'));
const DEV_VIRTUAL_DYNAMIC_ID = '/@id/__x00__$env/dynamic/private';
const PROD_VIRTUAL_DYNAMIC_ID = '\0$env/dynamic/private';
const DEV_VIRTUAL_STATIC_ID = '/@id/__x00__$env/static/private';
const PROD_VIRTUAL_STATIC_ID = '\0$env/static/private';
const USER_SERVER_ID = normalizePath(path.join(FAKE_LIB_DIR, 'test.server.js'));
const USER_SERVER_ID_NODE_MODULES = normalizePath(path.join(CWD, 'node_modules', 'test.server.js'));
const USER_SERVER_ID_OUTSIDE_ROOT = normalizePath(path.join(CWD, '..', 'test.server.js'));
const USER_SERVER_FOLDER_ID = normalizePath(path.join(FAKE_LIB_DIR, '/server/some/nested/path.js'));

/**
 * @template {any} T
 * @param {Array<T>} arr
 * @returns {Generator<T>}
 */
function* generator_from_array(arr) {
	for (const item of arr) {
		yield item;
	}
}

/**
 * @param {Array<import('./types').ImportGraph>} nodes_to_insert
 * @returns {import('./types').ImportGraph}
 */
function get_module_graph(...nodes_to_insert) {
	return {
		id: 'test.svelte',
		dynamic: false,
		children: generator_from_array([
			{
				id: 'fine.js',
				dynamic: false,
				children: generator_from_array([
					{
						id: 'also_fine.js',
						dynamic: false,
						children: generator_from_array([
							{
								id: 'erstwhile.css',
								dynamic: false,
								children: generator_from_array([])
							},
							{
								id: 'gruntled.js',
								dynamic: false,
								children: generator_from_array([])
							}
						])
					},
					{
						id: 'somewhat_neat.js',
						dynamic: false,
						children: generator_from_array([])
					},
					{
						id: 'blah.ts',
						dynamic: false,
						children: generator_from_array([])
					}
				])
			},
			{
				id: 'something.svelte',
				dynamic: false,
				children: generator_from_array(nodes_to_insert)
			},
			{
				id: 'im_not_creative.hamburger',
				dynamic: false,
				children: generator_from_array([])
			}
		])
	};
}

describe('IllegalImportGuard', (test) => {
	const guard = new IllegalModuleGuard(FAKE_LIB_DIR);

	test('assert succeeds for a graph with no illegal imports', () => {
		assert.not.throws(() => guard.assert_legal(get_module_graph()));
	});

	test('assert throws an error when importing $env/static/private in dev', () => {
		const module_graph = get_module_graph({
			id: DEV_VIRTUAL_STATIC_ID,
			dynamic: false,
			children: generator_from_array([])
		});
		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$env\/static\/private into public-facing code:.*/gs
		);
	});

	test('assert throws an error when importing $env/static/private in prod', () => {
		const module_graph = get_module_graph({
			id: PROD_VIRTUAL_STATIC_ID,
			dynamic: false,
			children: generator_from_array([])
		});
		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$env\/static\/private into public-facing code:.*/gs
		);
	});

	test('assert throws an error when importing $env/dynamic/private in dev', () => {
		const module_graph = get_module_graph({
			id: DEV_VIRTUAL_DYNAMIC_ID,
			dynamic: false,
			children: generator_from_array([])
		});
		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$env\/dynamic\/private into public-facing code:.*/gs
		);
	});

	test('assert throws an error when importing $env/dynamic/private in prod', () => {
		const module_graph = get_module_graph({
			id: PROD_VIRTUAL_DYNAMIC_ID,
			dynamic: false,
			children: generator_from_array([])
		});
		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$env\/dynamic\/private into public-facing code:.*/gs
		);
	});

	test('assert throws an error when importing a single server-only module', () => {
		const module_graph = get_module_graph({
			id: USER_SERVER_ID,
			dynamic: false,
			children: generator_from_array([])
		});

		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$lib\/test.server.js into public-facing code:.*/gs
		);
	});

	test('assert throws an error when importing a module in the server-only folder', () => {
		const module_graph = get_module_graph({
			id: USER_SERVER_FOLDER_ID,
			dynamic: false,
			children: generator_from_array([])
		});

		assert.throws(
			() => guard.assert_legal(module_graph),
			/.*Cannot import \$lib\/server\/some\/nested\/path.js into public-facing code:.*/gs
		);
	});

	test('assert ignores illegal server-only modules in node_modules', () => {
		const module_graph = get_module_graph({
			id: USER_SERVER_ID_NODE_MODULES,
			dynamic: false,
			children: generator_from_array([])
		});

		assert.not.throws(() => guard.assert_legal(module_graph));
	});

	test('assert ignores illegal server-only modules outside the project root', () => {
		const module_graph = get_module_graph({
			id: USER_SERVER_ID_OUTSIDE_ROOT,
			dynamic: false,
			children: generator_from_array([])
		});

		assert.not.throws(() => guard.assert_legal(module_graph));
	});
});

/*
We don't have a great way to mock Vite and Rollup's implementations of module graphs, so unit testing
ViteImportGraph and RollupImportGraph is kind of an exercise in "code coverage hubris" -- they're covered by
the integration tests, where Vite and Rollup can provide a useful graph implementation. If, in the future, we can find
a reason to unit test them, we can add those below.
*/
