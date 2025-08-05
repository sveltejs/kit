import {
	PlaywrightTestArgs,
	PlaywrightTestConfig,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType,
	Page
} from '@playwright/test';
import { IncomingMessage, ServerResponse } from 'node:http';
import '../types/index';
import { AfterNavigate, BeforeNavigate } from '@sveltejs/kit';

export const test: TestType<
	PlaywrightTestArgs &
		PlaywrightTestOptions & {
			app: {
				goto(url: string, opts?: { replaceState?: boolean }): Promise<void>;
				invalidate(url: string): Promise<void>;
				invalidateAll(): Promise<void>;
				beforeNavigate(fn: (navigation: BeforeNavigate) => void | boolean): void;
				afterNavigate(fn: (navigation: AfterNavigate) => void): void;
				preloadCode(pathname: string): Promise<void>;
				preloadData(url: string): Promise<void>;
			};
			clicknav(selector: string, options?: Parameters<Page['waitForNavigation']>[0]): Promise<void>;
			scroll_to(x: number, y: number): Promise<void>;
			in_view(selector: string): Promise<boolean>;
			get_computed_style(selector: string, prop: string): Promise<string>;
			/**
			 * `handleError` defines the shape
			 */
			read_errors(href: string): Record<string, any>;
			start_server(
				handler: (req: IncomingMessage, res: ServerResponse) => void
			): Promise<{ port: number }>;
			page: Page & {
				goto: (
					url: string,
					opts?: Parameters<Page['goto']>[1] & { wait_for_started?: boolean }
				) => ReturnType<Page['goto']>;
			};
			baseURL: string;
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export const config: PlaywrightTestConfig;
