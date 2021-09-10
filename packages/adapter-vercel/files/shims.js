import { randomBytes } from 'crypto';
export { fetch, Response, Request, Headers } from '@sveltejs/kit/install-fetch';

export const generateCspNonce = () => randomBytes(16).toString('base64');
