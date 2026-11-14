import { command, query } from '$app/server';

// defined in vite.config.js
// @ts-expect-error
export const environment = query(() => __TEST_ENVIRONMENT__);

let count = 0;

export const increment = command(() => (count += 1));
