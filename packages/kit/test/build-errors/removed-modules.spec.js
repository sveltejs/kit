import { expect, test } from 'vitest';
import { build, timeout } from './utils.js';

test('an unresolved $lib import explains how to migrate', { timeout }, () => {
	expect(build('removed-lib-import')).toContainKitDiagnostic('module_removed_lib');
});

test('an unresolved $service-worker import explains how to migrate', { timeout }, () => {
	expect(build('removed-service-worker-import')).toContainKitDiagnostic(
		'module_removed_service_worker'
	);
});
