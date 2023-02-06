import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { resolve } from 'import-meta-resolve';
import { adapters } from './adapters.js';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

/** @type {Record<string, (name: string, version: string) => string>} */
const commands = {
	npm: (name, version) => `npm install -D ${name}@${version}`,
	pnpm: (name, version) => `pnpm add -D ${name}@${version}`,
	yarn: (name, version) => `yarn add -D ${name}@${version}`
};

function detect_lockfile() {
	let dir = process.cwd();

	do {
		if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
		if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
		if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
	} while (dir !== (dir = dirname(dir)));

	return 'npm';
}

function detect_package_manager() {
	const manager = detect_lockfile();

	try {
		execSync(`${manager} --version`);
		return manager;
	} catch {
		return 'npm';
	}
}

/** @param {string} name */
async function import_from_cwd(name) {
	const cwd = pathToFileURL(process.cwd()).href;
	const url = await resolve(name, cwd + '/x.js');

	return import(url);
}

/** @typedef {import('@sveltejs/kit').Adapter} Adapter */

/**
 * @returns {Promise<Adapter | undefined>} The corresponding adapter for the current environment if found otherwise undefined
 */
async function get_adapter() {
	const match = adapters.find((candidate) => candidate.test());

	if (!match) return;

	/** @type {{ default: () => Adapter }} */
	let module;

	try {
		module = await import_from_cwd(match.module);
	} catch (error) {
		if (
			error.code === 'ERR_MODULE_NOT_FOUND' &&
			error.message.startsWith(`Cannot find package '${match.module}'`)
		) {
			const package_manager = detect_package_manager();
			const command = commands[package_manager](match.module, match.version);

			try {
				console.log(`Installing ${match.module}...`);

				execSync(command, {
					stdio: 'inherit',
					env: {
						...process.env,
						NODE_ENV: undefined
					}
				});

				module = await import_from_cwd(match.module);

				console.log(`Successfully installed ${match.module}.`);
				console.warn(
					`\nIf you plan on staying on this deployment platform, consider replacing @sveltejs/adapter-auto with ${match.module}. This will give you faster and more robust installs, and more control over deployment configuration.\n`
				);
			} catch (e) {
				throw new Error(
					`Could not install ${match.module}. Please install it yourself by adding it to your package.json's devDependencies and try building your project again.`,
					{ cause: e }
				);
			}
		} else {
			throw error;
		}
	}

	const adapter = module.default();

	return {
		...adapter,
		adapt: (builder) => {
			builder.log.info(`Detected environment: ${match.name}. Using ${match.module}`);
			return adapter.adapt(builder);
		}
	};
}

/** @type {() => Adapter} */
export default () => ({
	name: '@sveltejs/adapter-auto',
	adapt: async (builder) => {
		const adapter = await get_adapter();

		if (adapter) return adapter.adapt(builder);

		builder.log.warn(
			'Could not detect a supported production environment. See https://kit.svelte.dev/docs/adapters to learn how to configure your app to run on the platform of your choosing'
		);
	}
});
