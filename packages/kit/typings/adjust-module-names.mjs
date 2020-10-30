import { existsSync, readFileSync, writeFileSync } from 'fs';

process.chdir('..');

const alias = '$app';

const typings_file = 'index.d.ts';

const data = readFileSync(typings_file, 'utf8').replace(/ (module|from) ['"]([^'"]+)['"]/g, (m, word, id) => {
	if (existsSync(`src/runtime/${id}.ts`)) {
		return ` ${word} "${alias}/${id.replace(/\/index$/, '')}"`;
	}

	return m;
});

writeFileSync(typings_file, data);