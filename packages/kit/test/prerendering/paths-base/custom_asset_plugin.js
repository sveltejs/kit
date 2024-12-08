import fs from 'node:fs';
import path from 'node:path';

export default function () {
	let config;
	const ext = '.csv';
	return {
		name: 'vite-plugin-sveltekit-custom-asset',
		resolveId(id) {
			if (id.endsWith(ext)) {
				return id;
			}
		},
		configResolved(resolvedConfig) {
			config = resolvedConfig;
		},
		load(id) {
			if (!id.endsWith(ext)) return;
			if (config.command === 'serve')
				return `export default "${path.relative(process.cwd(), id).replaceAll(path.sep, '/')}";`;

			const outName = config.build.rollupOptions.output.assetFileNames
				.replace('[name]', path.basename(id, ext))
				.replace('[hash]', '000000')
				.replace('[extname]', ext);

			if (config.build?.ssr) {
				const ref = this.emitFile({
					type: 'asset',
					fileName: outName
				});
				fs.readFile(id, (err, data) => {
					if (err) this.error(err);
					this.setAssetSource(ref, data);
				});
			}

			return `export default "${config.base}${outName}";`;
		}
	};
}
