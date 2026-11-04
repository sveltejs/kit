// Playwright's `webServer.command` for the adapter test apps: deploys the app in the current
// directory, runs the given package.json scripts in the copy and keeps the last one running,
// then removes the copy on SIGTERM (Playwright sends it when `gracefulShutdown` is configured).
// With `--prod=<dir>`, the last script runs in a second copy that has only the app's
// `dependencies` installed, with the built `<dir>` copied over, like a production deployment
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { deploy } from './deploy.js';

const dir = process.cwd();
const { scripts } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));

const names = process.argv.slice(2);
const output = names[0]?.startsWith('--prod=') ? names.shift()?.slice('--prod='.length) : undefined;
const last = /** @type {string} */ (names.pop());

const copies = [deploy(dir)];
/** @param {string} app */
const env = (app) => ({
	...process.env,
	PATH: `${path.join(app, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`
});

for (const name of names) {
	execSync(scripts[name], { cwd: copies[0], env: env(copies[0]), stdio: 'inherit' });
}

if (output) {
	const prod = deploy(dir, { prod: true });
	fs.cpSync(path.join(copies[0], output), path.join(prod, output), { recursive: true });
	copies.push(prod);
}

const app = copies[copies.length - 1];
const server = spawn(scripts[last], { cwd: app, env: env(app), stdio: 'inherit', shell: true });
let stopping = false;

server.on('exit', (code) => {
	for (const copy of copies) fs.rmSync(copy, { recursive: true, force: true });
	process.exit(stopping ? 0 : (code ?? 1));
});

process.on('SIGTERM', () => {
	stopping = true;
	server.kill('SIGTERM');
});
