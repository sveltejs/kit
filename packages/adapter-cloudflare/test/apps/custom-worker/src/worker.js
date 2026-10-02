import { respond } from 'virtual:todo-name-cloudflare-handler';
import { sum } from './lib/shared';

// export class TestDurableObject extends DurableObject

sum(1, 1);

/** @type {import('@cloudflare/workers-types').ExportedHandler} */
export default {
	fetch: respond
};
