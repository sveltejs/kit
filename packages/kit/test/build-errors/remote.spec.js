import { expect, test } from 'vitest';
import { build, timeout } from './utils.js';

test('*.remote.js files cannot be used without the experimental.remoteFunctions flag', { timeout }, () => {
	// the config snippet itself is covered by the unit tests of `config_snippet`
	expect(build('remote-function-without-flag')).toContainKitDiagnostic('config_feature_disabled', {
		contains: ['remote functions', 'remoteFunctions: true']
	});
});
