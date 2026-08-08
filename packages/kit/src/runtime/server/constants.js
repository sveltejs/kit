export const NULL_BODY_STATUS = [101, 103, 204, 205, 304];

// eslint-disable-next-line n/prefer-global/process
export const IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;

/**
 * If an an adapter deploys a catch-all serverless function, the rerouted URL
 * is stored in this header.
 */
export const REROUTED_URL_HEADER = 'x-sveltekit-rerouted-url';
