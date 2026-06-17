declare const __TEST_USER_DEFINE__: string;

interface Window {
	__test_user_define__: string;
}

// stubs for explicit environment variables when evaluating the service worker file
declare var importScripts: () => void;
declare var __sveltekit_sw: { env: {} };
