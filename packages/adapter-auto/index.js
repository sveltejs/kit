import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { resolve } from 'import-meta-resolve';
import { adapters } from './adapters.js';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

/** @type {import('./index').default} */
let fn;

/** @type {Record<string, (name: string) => string>} */
const commands = {
	npm: (name) => `npm install -D ${name}`,
	pnpm: (name) => `pnpm add -D ${name}`,
	yarn: (name) => `yarn add -D ${name}`
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

for (const candidate of adapters) {
	if (candidate.test()) {
		/** @type {{ default: () => import('@sveltejs/kit').Adapter }} */
		let module;

		try {
			module = await import_from_cwd(candidate.module);
		} catch (error) {
			if (
				error.code === 'ERR_MODULE_NOT_FOUND' &&
				error.message.startsWith(`Cannot find package '${candidate.module}'`)
			) {
				const package_manager = detect_package_manager();
				const command = commands[package_manager](candidate.module);

				try {
					console.log(`Installing ${candidate.module}...`);

					execSync(command, {
						stdio: 'inherit',
						env: {
							...process.env,
							NODE_ENV: undefined
						}
					});

					module = await import_from_cwd(candidate.module);

					console.log(`Successfully installed ${candidate.module}.`);
					console.warn(
						`\nIf you plan on staying on this deployment platform, consider replacing @sveltejs/adapter-auto with ${candidate.module}. This will give you faster and more robust installs, and more control over deployment configuration.\n`
					);
				} catch (e) {
					throw new Error(
						`Could not install ${candidate.module}. Please install it yourself by adding it to your package.json's devDependencies and try building your project again.`
					);
				}
			} else {
				throw error;
			}
		}

		fn = () => {
			const adapter = module.default();
			return {
				...adapter,
				adapt: (builder) => {
					builder.log.info(`Detected environment: ${candidate.name}. Using ${candidate.module}`);
					return adapter.adapt(builder);
				}
			};
		};

		break;
	}
}

if (!fn) {
	fn = () => ({
		name: '@sveltejs/adapter-auto',
		adapt: (builder) => {
			builder.log.warn(
				'Could not detect a supported production environment. See https://kit.svelte.dev/docs/adapters to learn how to configure your app to run on the platform of your choosing'
			);
		}
	});
}

export default fn;
