import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const [node, , ...args] = process.argv;
const mode = process.env.CI ? 'dist' : 'src';
const bin = fileURLToPath(new URL(`../${mode}/cli.js`, import.meta.url));

spawn(node, [bin, ...args], {
	stdio: 'inherit'
});
