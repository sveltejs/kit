import { spawn } from 'child_process';

const [node, , ...args] = process.argv;

const child = spawn(node, ['node_modules/vite/bin/vite.js', ...args], {
	stdio: 'inherit'
});

if (child) {
	child.on('exit', process.exit);
}
