import { expect, test } from 'vitest';
import { create_env_modules } from './env.js';
import { validate_config } from './config/index.js';

/**
 * @param {any} origin
 * @param {string | null} entry
 */
function config_module(origin, entry = null) {
	const config = validate_config({ paths: { origin } });
	return create_env_modules(config, entry ? {} : null, {}, '/generated', entry, false)['config.js'];
}

test('inlines a string paths.origin', () => {
	expect(config_module('https://my.site')).toContain(
		'export let paths_origin = "https://my.site";'
	);
});

test.each([null, 'src/env.js'])(
	'reads paths.origin from the environment when the app starts, with src/env %s',
	(entry) => {
		const code = config_module({ env: 'ORIGIN' }, entry);

		expect(code).toContain('export let paths_origin = void 0;');
		expect(code).toContain('paths_origin = to_origin(env["ORIGIN"], "ORIGIN", issues);');
		expect(code).toContain("from '@sveltejs/kit/internal/env';");
	}
);
