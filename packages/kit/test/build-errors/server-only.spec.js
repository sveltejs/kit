import { expect, test } from 'vitest';
import { build, timeout } from './utils.js';

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
const env = { TEST: 'false' };

test('#lib/*.server.* is not statically importable from the client', { timeout }, () => {
	expect(build('server-only-module', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['#lib/test.server.js', ' src/routes/+page.svelte imports\n  #lib/test.server.js']
	});
});

test('#lib/*.server.* is not dynamically importable from the client', { timeout }, () => {
	expect(build('server-only-module-dynamic-import', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['#lib/test.server.js']
	});
});

test('#lib/**/server/* is not statically importable from the client', { timeout }, () => {
	expect(build('server-only-folder', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['#lib/blah/server/something/private.js']
	});
});

test('#lib/**/server/* is not dynamically importable from the client', { timeout }, () => {
	expect(build('server-only-folder-dynamic-import', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['#lib/blah/server/something/private.js']
	});
});

test(
	'a server-only module imported by both server and client code reports the browser import',
	{ timeout },
	() => {
		// Regression test for https://github.com/sveltejs/kit/issues/16232 —
		// the guard must search all importers, not just the first, otherwise it
		// could follow a server-only branch and throw "An impossible situation occurred"
		// instead of reporting the real client-side import.
		expect(build('server-only-shared', env)).toContainKitDiagnostic('server_only_import', {
			contains: ['#lib/secret.server.js']
		});
	}
);
