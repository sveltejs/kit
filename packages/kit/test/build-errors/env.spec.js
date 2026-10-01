import { expect, test } from 'vitest';
import { build, timeout } from './utils.js';

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
const env = { TEST: 'false' };

test('$app/env/private is not statically importable from the client', { timeout }, () => {
	expect(build('env-private', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['$app/env/private']
	});
});

test('$app/env/private is not dynamically importable from the client', { timeout }, () => {
	expect(build('env-private-dynamic', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['$app/env/private']
	});
});

test('$app/env/private is not importable from client hooks outside the project root', { timeout }, () => {
	expect(build('env-private-out-of-root-hooks', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['$app/env/private']
	});
});

test('$app/env/private is not importable from the service worker', { timeout }, () => {
	expect(build('env-private-service-worker', env)).toContainKitDiagnostic('server_only_import', {
		contains: ['$app/env/private']
	});
});

test(
	'$app/forms, $app/navigation and $app/state are not importable from the service worker',
	{ timeout },
	() => {
		expect(build('service-worker-invalid-app-imports', env)).toContainKitDiagnostic('service_worker_invalid_import', {
			contains: ['$app/forms, $app/navigation, $app/state']
		});
	}
);
