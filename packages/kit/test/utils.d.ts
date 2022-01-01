import {
	PlaywrightTestArgs,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType
} from '@playwright/test';

export const test: TestType<
	PlaywrightTestArgs &
		PlaywrightTestOptions & {
			app: {
				goto: (url: string) => Promise<void>;
				invalidate: (url: string) => Promise<void>;
				prefetch: (url: string) => Promise<void>;
				prefetchRoutes: (urls: string[]) => Promise<void>;
			};
			clicknav: (selector: string) => Promise<void>;
			is_in_viewport: (selector: string) => Promise<boolean>;
			read_errors: (href: string) => string;
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;
