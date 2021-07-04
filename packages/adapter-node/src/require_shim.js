import { createRequire } from 'module';
globalThis.require = createRequire(import.meta.url);
