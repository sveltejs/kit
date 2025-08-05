import process from 'node:process';
import { config } from '../../utils.js';

export default {
	...config,
	webServer: {
		...config.webServer,
		command: process.env.DEV
			? `cross-env ROUTER_RESOLUTION=${process.env.ROUTER_RESOLUTION ?? 'client'} pnpm dev`
			: `cross-env ROUTER_RESOLUTION=${process.env.ROUTER_RESOLUTION ?? 'client'} pnpm build && pnpm preview`
	}
};
