import { Options } from './internal';

/**
 * Create a new SvelteKit project.
 * @param {string} cwd - Path to the directory to create
 * @param {import('./internal').Options} options
 */
export function create(cwd: string, options: Options): Promise<void>;
