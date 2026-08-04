import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const dir = dirname(fileURLToPath(import.meta.url));
