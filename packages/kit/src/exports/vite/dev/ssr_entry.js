/** @import { InternalServer } from 'types' */
import init_server from '__sveltekit/dev-handler';
import { env } from '__sveltekit/dev-env';
import { Server } from './server.js';
import { manifest } from './ssr_manifest.js';

/** @type {InternalServer} */
const server = new Server(manifest);

const handle = await init_server(server, env);

export default handle;
