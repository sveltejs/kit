import { respond } from 'virtual:todo-name-cloudflare-handler';

/** @type {import('@cloudflare/workers-types').ExportedHandler<Cloudflare.Env>} */
export default {
	fetch: respond
};
