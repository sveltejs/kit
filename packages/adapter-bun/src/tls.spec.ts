import { afterEach, describe, expect, test, vi } from 'vitest';
import { get_tls_options, tls_files } from './tls.js';

const { file } = vi.hoisted(() => {
	const file = vi.fn((path: string) => ({ path }));
	vi.stubGlobal('ENV_PREFIX', '');
	vi.stubGlobal('Bun', { file });
	return { file };
});

afterEach(() => {
	vi.unstubAllEnvs();
	file.mockClear();
});

describe('tls_files', () => {
	test('converts a path to a BunFile', () => {
		expect(tls_files('cert.pem')).toEqual({ path: 'cert.pem' });
		expect(file).toHaveBeenCalledWith('cert.pem');
	});

	test('converts a JSON path list to BunFiles', () => {
		expect(tls_files('["cert.pem","chain.pem"]')).toEqual([
			{ path: 'cert.pem' },
			{ path: 'chain.pem' }
		]);
	});

	test.each(['', '[]', '[""]', '[1]'])('rejects an invalid path list: %s', (value) => {
		expect(() => tls_files(value)).toThrow(/must (?:not be empty|be non-empty strings)/);
	});

	test('reports malformed JSON arrays', () => {
		expect(() => tls_files('["cert.pem"')).toThrow('must be JSON arrays of paths');
	});
});

describe('get_tls_options', () => {
	test('returns configured TLS options unchanged without environment overrides', () => {
		const configured = { cert: 'certificate', key: 'private key', requestCert: true };
		expect(get_tls_options(configured)).toBe(configured);
	});

	test('merges path environment variables with configured options', () => {
		vi.stubEnv('TLS_CA', 'ca.pem');
		expect(get_tls_options({ cert: 'certificate', key: 'private key' })).toEqual({
			cert: 'certificate',
			key: 'private key',
			ca: { path: 'ca.pem' }
		});
	});

	test('requires a certificate and private key when environment variables configure TLS', () => {
		vi.stubEnv('TLS_CA', 'ca.pem');
		expect(() => get_tls_options(undefined)).toThrow(
			'TLS configuration requires both a certificate and a private key'
		);
	});

	test('does not merge environment variables into an SNI array', () => {
		vi.stubEnv('TLS_CERT', 'cert.pem');
		expect(() => get_tls_options([{ serverName: 'example.com' }])).toThrow(
			'cannot be merged with an SNI array'
		);
	});
});
