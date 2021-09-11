import { randomBytes } from 'crypto';
export { fetch, Response, Request, Headers } from '@sveltejs/kit/install-fetch';

export const generateRandomString = (bytes) => randomBytes(bytes).toString('base64');
