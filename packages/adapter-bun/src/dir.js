import { resolve } from 'node:path';

// Bun places shared modules in <out>/server/chunks.
export const dir = resolve(import.meta.dir, '../..');
