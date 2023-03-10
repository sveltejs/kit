import { Adapter } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';
import './ambient.js';

interface DefaultEsbuildOptions {
	entryPoints: [string];
	outfile: '.netlify/edge-functions/render.js';
	bundle: true;
	format: 'esm';
	platform: 'browser';
	sourcemap: 'linked';
	target: 'es2020';
}

type esbuild = (
	defaultOptions: DefaultEsbuildOptions
) => Required<Pick<BuildOptions, keyof DefaultEsbuildOptions>> & Partial<BuildOptions>;

export default function plugin(opts?: {
	split?: boolean;
	edge?: boolean;
	esbuild?: esbuild;
}): Adapter;
