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
			is_in_viewport: (selector: string) => Promise<boolean>;
			clicknav: (selector: string) => Promise<void>;
		},
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;
