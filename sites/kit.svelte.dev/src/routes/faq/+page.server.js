import fs from 'fs';
import { read_file } from '$lib/docs/server';

export async function load() {
	const sections = [];

	for (const file of fs.readdirSync(`../../documentation/faq`)) {
		const section = await read_file(`faq/${file}`);
		if (section) sections.push(section);
	}

	return { sections };
}
