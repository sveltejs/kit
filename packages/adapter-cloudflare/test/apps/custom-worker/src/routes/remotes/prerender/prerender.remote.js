// this import will error if this file is evaluated outside the workerd environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { env } from 'cloudflare:workers';
import { prerender } from '$app/server';

export const get_text = prerender(() => {
	return 'this text is prerendered at build-time';
});
