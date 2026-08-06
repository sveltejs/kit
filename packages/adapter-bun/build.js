import { rmSync } from 'node:fs';

rmSync('files', { recursive: true, force: true });

const result = await Bun.build({
	entrypoints: ['src/index.js'],
	outdir: 'files',
	target: 'bun',
	format: 'esm',
	// resolved at adapt time
	external: ['MANIFEST', 'ROUTES', 'SERVER', 'SERVER_OPTIONS']
});

if (!result.success) {
	throw new AggregateError(result.logs, 'Could not build adapter-bun');
}
