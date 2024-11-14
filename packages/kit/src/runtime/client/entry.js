// we expose this as a separate entry point (rather than treating client.js as the entry point)
// so that everything other than `start` can be treeshaken
export { start } from './client.js';
