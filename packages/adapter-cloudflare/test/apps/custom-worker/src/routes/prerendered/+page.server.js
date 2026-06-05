// this import will error if this file is evaluated outside the workerd environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { env } from 'cloudflare:workers';

export const prerender = true;
