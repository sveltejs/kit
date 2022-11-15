import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { adapters } from './adapters.js';

/** @type {import('./index').default} */
let fn;

for (const candidate of adapters) {
	if (candidate.test()) {
		/** @type {{ default: () => import('@sveltejs/kit').Adapter }} */
		let module;

		try {
			module = await import(candidate.module);
		} catch (error) {
			if (
				error.code === 'ERR_MODULE_NOT_FOUND' &&
				error.message.startsWith(`Cannot find package '${candidate.module}'`)
			) {
				const current = process.env.NODE_ENV;
				try {
					console.log(`Installing ${candidate.module} on the fly...`);
					process.env.NODE_ENV = undefined;
					execSync(
						`${process.platform === 'win32' ? 'set' : ''} NODE_ENV=ignore_me && npm install ${
							candidate.module
						} --no-save --no-package-lock`,
						{
							stdio: 'inherit',
							cwd: dirname(fileURLToPath(import.meta.url)),
							env: {}
						}
					);
					process.env.NODE_ENV = current;
					module = await import(candidate.module);
					console.log(
						`Successfully installed ${candidate.module} on the fly. If you plan on staying on this deployment platform, consider switching out @sveltejs/adapter-auto for ${candidate.module} for faster and more robust installs.`
					);
				} catch (e) {
					process.env.NODE_ENV = current;
					// if (
					// 	error.code === 'ERR_MODULE_NOT_FOUND' &&
					// 	error.message.startsWith(`Cannot find package '${candidate.module}'`)
					// ) {
					throw new Error(
						`Could not install ${candidate.module} on the fly. Please install it yourself by adding it to your package.json's devDependencies and try building your project again.`
					);
					// }
					// ignore other errors, but print them
					console.warn(e);
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
