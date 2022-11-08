import {
	PlaywrightTestArgs,
	PlaywrightTestConfig,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType
} from '@playwright/test';
import { IncomingMessage, ServerResponse } from 'http';
import { Plugin } from 'vite';

export const test: TestType<
	PlaywrightTestArgs &
		PlaywrightTestOptions & {
			app: {
				goto(url: string, opts?: { replaceState?: boolean }): Promise<void>;
				invalidate(url: string): Promise<void>;
				beforeNavigate(url: URL): void | boolean;
				afterNavigate(url: URL): void;
				prefetch(url: string): Promise<void>;
				prefetchRoutes(urls: string[]): Promise<void>;
			};
			clicknav(selector: string, options?: { timeout?: number }): Promise<void>;
			in_view(selector: string): Promise<boolean>;
			/**
			 * `handleError` defines the shape
			 */
			read_errors(href: string): Record<string, any>;
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export const config: PlaywrightTestConfig;

export const start_server: (
	handler: (req: IncomingMessage, res: ServerResponse) => void,
	start?: number
) => Promise<{
	port: number;
	close(): Promise<void>;
}>;

export const plugin: () => Plugin;
