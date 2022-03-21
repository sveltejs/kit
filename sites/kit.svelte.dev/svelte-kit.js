import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const [node, , ...args] = process.argv;
const mode = process.env.CI ? 'dist' : 'src';
const bin = fileURLToPath(new URL(`../../packages/kit/${mode}/cli.js`, import.meta.url));

const child = spawn(node, [bin, ...args], {
	stdio: 'inherit'
});

if (child) {
	child.on('exit', process.exit);
}
