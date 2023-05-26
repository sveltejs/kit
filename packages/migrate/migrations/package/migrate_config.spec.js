import { assert, test } from 'vitest';
import { remove_package_from_config } from './migrate_config.js';

test('Removes package config #1', () => {
	const result = remove_package_from_config(`
    export default {
        kit: {
            files: {
                lib: 'src/lib'
            }
        },
        package: {
            dir: 'package',
            exports: (filepath) => !/^_|\\/_|\\.d\\.ts$/.test(filepath),
            files: () => true
        },
        preprocess: []
    }`);
	assert.equal(
		result,
		`
    export default {
        kit: {
            files: {
                lib: 'src/lib'
            }
        },
        preprocess: []
    }`
	);
});

test('Removes package config #2', () => {
	const result = remove_package_from_config(`
    export default {
        package: {
            dir: 'package',
            exports: (filepath) => !/^_|\\/_|\\.d\\.ts$/.test(filepath),
            files: () => true
        },
    }`);
	assert.equal(
		result,
		`
    export default {}`
	);
});

test('Removes package config #3', () => {
	const result = remove_package_from_config(`
    const config = {
        package: {
            dir: 'package',
            exports: (filepath) => !/^_|\\/_|\\.d\\.ts$/.test(filepath),
            files: () => true
        },
    };
    export default config;`);
	assert.equal(
		result,
		`
    const config = {};
    export default config;`
	);
});

test('Leaves config untouched', () => {
	const content = `
    export default {
        kit: {
            files: {
                lib: 'src/lib'
            }
        },
    }`;
	const result = remove_package_from_config(content);
	assert.equal(result, content);
});
