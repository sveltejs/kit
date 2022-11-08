import fs from 'fs';
import { read_file } from '$lib/docs/server';
import { error } from '@sveltejs/kit';

const base = '../../documentation/docs';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	for (const subdir of fs.readdirSync(base)) {
		if (!fs.statSync(`${base}/${subdir}`).isDirectory()) continue;

		for (const file of fs.readdirSync(`${base}/${subdir}`)) {
			if (file.slice(3, -3) === params.slug) {
				return {
					page: await read_file(`docs/${subdir}/${file}`)
				};
			}
		}
	}

	throw error(404);
}
