import { rmSync } from 'node:fs';

rmSync('files', { recursive: true, force: true });

const result = await Bun.build({
	entrypoints: ['src/index.js', 'src/handler.js', 'src/dir.js'],
	outdir: 'files',
	target: 'bun',
	format: 'esm',
	splitting: true,
	naming: {
		entry: '[name].[ext]',
		chunk: 'chunks/[name]-[hash].[ext]'
	},
	// resolved at adapt time
	external: ['MANIFEST', 'SERVER', 'SERVER_OPTIONS']
});

if (!result.success) {
	throw new AggregateError(result.logs, 'Could not build adapter-bun');
}
