import worker from '../files/worker.js';

/** @type {import('./exports.d.ts')['fetch']} */
const fetch = worker.fetch;

export { fetch };
