import { import_peer } from '../../utils/import.js';

/** @type {typeof import('typescript')} */
export let ts;

try {
	ts = (await import_peer('typescript')).default;
} catch {}
