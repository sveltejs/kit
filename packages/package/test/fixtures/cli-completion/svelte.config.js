import fs from 'node:fs';
import process from 'node:process';

export default {
	preprocess: {
		async markup({ content }) {
			setInterval(() => {}, 1000);
			process.on('exit', () => fs.writeFileSync('dist/exit.txt', 'exited'));

			// Write when packaging logs completion, so output is still buffered when the CLI exits.
			const log = console.log;
			console.log = (...args) => {
				process.stdout.write('out\n'.repeat(32_768));
				process.stderr.write('err\n'.repeat(32_768));
				log(...args);
			};

			await new Promise((fulfil) => setTimeout(fulfil, 25));
			return { code: content.replace('demo', 'async demo') };
		}
	}
};
