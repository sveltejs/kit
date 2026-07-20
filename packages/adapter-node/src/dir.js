import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// this needs to end up in the root of the output directory
// otherwise, it would cause incorrect paths to be constructed
export const dir = dirname(fileURLToPath(import.meta.url));
