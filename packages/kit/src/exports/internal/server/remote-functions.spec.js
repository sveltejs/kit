import { expect, test } from 'vitest';
import { init_remote_functions } from './remote-functions.js';

test('remote modules reject default exports', () => {
	expect(() =>
		init_remote_functions({ default: () => {} }, 'src/lib/a.remote.js', 'hash')
	).toThrowKitError('remote_module_default_export', { contains: ['src/lib/a.remote.js'] });
});

test('remote modules reject exports that are not remote functions', () => {
	expect(() =>
		init_remote_functions({ helper: () => {} }, 'src/lib/a.remote.js', 'hash')
	).toThrowKitError('remote_module_invalid_export', {
		contains: ['helper', 'src/lib/a.remote.js']
	});
});

test.each(['command', 'form', 'prerender', 'query', 'query_batch', 'query_live'])(
	'remote modules retain %s metadata',
	(type) => {
		const fn = Object.assign(() => {}, { __: { type, id: '', name: '' } });
		init_remote_functions({ fn }, 'src/lib/a.remote.js', 'hash');
		expect(fn.__).toEqual({ type, id: 'hash/fn', name: 'fn' });
	}
);
