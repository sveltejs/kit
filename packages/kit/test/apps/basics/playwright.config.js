import process from 'node:process';
import { config } from '../../utils.js';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	...config,
	webServer: {
		command: process.env.DEV ? `pnpm dev` : `pnpm build && pnpm preview`,
		port: process.env.DEV ? 5173 : 4173,
		env: {
			PUBLIC_PRERENDERING: 'false',
			ROUTER_RESOLUTION: process.env.ROUTER_RESOLUTION ?? 'client'
		}
	}
});
