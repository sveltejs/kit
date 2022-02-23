import {
	PlaywrightTestArgs,
	PlaywrightTestConfig,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType
} from '@playwright/test';
import { IncomingMessage, Server, ServerResponse } from 'http';

export const test: TestType<
	PlaywrightTestArgs &
		PlaywrightTestOptions & {
			app: {
				goto: (url: string, opts?: { replaceState?: boolean }) => Promise<void>;
				invalidate: (url: string) => Promise<void>;
				beforeNavigate: (url: URL) => void | boolean;
				afterNavigate: (url: URL) => void;
				prefetch: (url: string) => Promise<void>;
				prefetchRoutes: (urls: string[]) => Promise<void>;
			};
			back: () => Promise<void>;
			clicknav: (selector: string, options?: { timeout?: number }) => Promise<void>;
			in_view: (selector: string) => Promise<boolean>;
			read_errors: (href: string) => string;
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export const config: PlaywrightTestConfig;

export const start_server: (
	handler: (req: IncomingMessage, res: ServerResponse) => void,
	start?: number
) => {
	server: Server;
	port: number;
};
