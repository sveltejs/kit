import { execSync } from 'node:child_process';
import { adapters } from './adapters.js';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

/** @type {Record<string, (name: string, version: string) => string>} */
const commands = {
	npm: (name, version) => `npm install -D ${name}@${version}`,
	pnpm: (name, version) => `pnpm add -D ${name}@${version}`,
	yarn: (name, version) => `yarn add -D ${name}@${version}`,
	bun: (name, version) => `bun add -D ${name}@${version}`
};

function detect_lockfile() {
	let dir = process.cwd();

	/** @param {string} file */
	const exists = (file) => fs.existsSync(path.join(dir, file));

	do {
		if (exists('pnpm-lock.yaml')) return 'pnpm';
		if (exists('yarn.lock')) return 'yarn';
		if (exists('package-lock.json')) return 'npm';
		if (exists('bun.lockb') || exists('bun.lock')) return 'bun';
	} while (dir !== (dir = path.dirname(dir)));

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

/**
 * Resolves a peer dependency relative to the current CWD. Duplicated with `packages/kit`
 * @param {string} dependency
 */
function resolve_peer(dependency) {
	let [name, ...parts] = dependency.split('/');
	if (name[0] === '@') name += `/${parts.shift()}`;

	let dir = process.cwd();

	while (!fs.existsSync(`${dir}/node_modules/${name}/package.json`)) {
		if (dir === (dir = path.dirname(dir))) {
			throw new Error(
				`Could not resolve peer dependency "${name}" relative to your project — please install it and try again.`
			);
		}
	}

	const pkg_dir = `${dir}/node_modules/${name}`;
	const pkg = JSON.parse(fs.readFileSync(`${pkg_dir}/package.json`, 'utf-8'));

	const subpackage = ['.', ...parts].join('/');

	let exported = pkg.exports[subpackage];

	while (typeof exported !== 'string') {
		if (!exported) {
			throw new Error(`Could not find valid "${subpackage}" export in ${name}/package.json`);
		}

		exported = exported['import'] ?? exported['default'];
	}

	return path.resolve(pkg_dir, exported);
}

/** @typedef {import('@sveltejs/kit').Adapter} Adapter */

/**
 * @returns {Promise<Adapter | undefined>} The corresponding adapter for the current environment if found otherwise undefined
 */
async function get_adapter() {
	const match = adapters.find((candidate) => candidate.test());

	if (!match) return;

	/** @type {string} */
	let resolved;

	try {
		resolved = resolve_peer(match.module);
	} catch {
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

			resolved = resolve_peer(match.module);

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
	}

	/** @type {{ default: () => Adapter }} */
	const module = await import(resolved);

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
			'Could not detect a supported production environment. See https://svelte.dev/docs/kit/adapters to learn how to configure your app to run on the platform of your choosing'
		);
	},
	supports: {
		read: () => {
			supports_error(
				'The read function imported from $app/server only works in certain environments'
			);
		}
	}
});

/**
 * @param {string} message
 * @returns {never}
 * @throws {Error}
 */
function supports_error(message) {
	throw new Error(
		`${message}. Since you're using @sveltejs/adapter-auto, SvelteKit cannot determine whether it will work when your app is deployed. Please replace it with an adapter tailored to your target environment.`
	);
}
