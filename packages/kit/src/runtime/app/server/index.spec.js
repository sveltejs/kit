import { afterAll, expect, test, vi } from 'vitest';

vi.stubGlobal('__SVELTEKIT_DEV__', false);
vi.stubGlobal('__SVELTEKIT_APP_VERSION__', 'test');
vi.stubGlobal('__SVELTEKIT_TRACK__', vi.fn());
afterAll(() => vi.unstubAllGlobals());

const { read } = await import('./index.js');
const { set_read_implementation } = await import('../../server/internal.js');
set_read_implementation(() => new ReadableStream());

test.each(['', 'hello', 'café', '中文', '\u{1f680}'])(
	'read uses the byte length of an inline asset: %j',
	async (title) => {
		const text = `<svg xmlns="http://www.w3.org/2000/svg"><title>${title}</title></svg>`;
		const response = read(`data:image/svg+xml,${encodeURIComponent(text)}`);
		const body = await response.arrayBuffer();

		expect(new TextDecoder().decode(body)).toBe(text);
		expect(response.headers.get('content-type')).toBe('image/svg+xml');
		expect(response.headers.get('content-length')).toBe(body.byteLength.toString());
	}
);

test.each(['data:text/plain,café', 'data:text/plain;base64,Y2Fmw6k='])(
	'read preserves unescaped and base64 inline assets: %s',
	async (asset) => {
		const response = read(asset);
		expect(await response.text()).toBe('café');
		expect(response.headers.get('content-type')).toBe('text/plain');
		expect(response.headers.get('content-length')).toBe('5');
	}
);
