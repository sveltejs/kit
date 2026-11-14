import { command, query } from '$app/server';

// defined in vite.config.js
// @ts-expect-error
const environment_name = __TEST_ENVIRONMENT__;

if (environment_name !== 'other') {
	throw new Error('remote modules should only run in the environment that renders requests');
}

export const environment = query(() => environment_name);

let count = 0;

export const increment = command(() => (count += 1));
