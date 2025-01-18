import process from 'node:process';
import { app_ports, create_config } from '../../utils.js';

const ports = app_ports['test-basics'];
const config = create_config(ports);

export default {
	...config,
	webServer: {
		command: process.env.DEV
			? `cross-env PUBLIC_PRERENDERING=false pnpm dev --port=${ports.dev}`
			: `cross-env PUBLIC_PRERENDERING=true pnpm build && pnpm preview --port=${ports.prod}`,
		port: process.env.DEV ? ports.dev : ports.prod
	}
};
