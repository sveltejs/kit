import { createRequire } from 'module';
import { randomBytes } from 'crypto';
export { fetch, Response, Request, Headers } from '@sveltejs/kit/install-fetch';

export const generateRandomString = (bytes) => randomBytes(bytes).toString('base64');

// esbuild automatically renames "require"
// So we still have to use Object.defineProperty here
Object.defineProperty(globalThis, 'require', {
	enumerable: true,
	value: createRequire(import.meta.url)
});
