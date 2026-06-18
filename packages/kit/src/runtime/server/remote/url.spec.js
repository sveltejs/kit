import { describe, expect, test } from 'vitest';
import { app_dir, base } from '$app/paths/internal/server';
import { get_remote_action, get_remote_id } from './url.js';

// build URLs from the configured paths rather than hardcoding `_app`/empty base,
// so these tests don't silently break if the `$app/paths/internal/server` mock changes
const remote_prefix = `${base}/${app_dir}/remote/`;

describe('get_remote_id', () => {
	test('extracts the id from a remote request URL', () => {
		expect(get_remote_id(new URL(`http://localhost${remote_prefix}abc123/myfn`))).toBe(
			'abc123/myfn'
		);
	});

	test('returns undefined for non-remote URLs', () => {
		expect(get_remote_id(new URL(`http://localhost${base}/about`))).toBe(undefined);
		expect(get_remote_id(new URL(`http://localhost${base}/${app_dir}/version.json`))).toBe(
			undefined
		);
	});
});

describe('get_remote_action', () => {
	test('reads the `/remote` search param', () => {
		expect(get_remote_action(new URL('http://localhost/page?/remote=abc/submit'))).toBe(
			'abc/submit'
		);
	});

	test('returns null when absent', () => {
		expect(get_remote_action(new URL('http://localhost/page'))).toBe(null);
	});
});
