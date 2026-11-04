// Playwright's `webServer.command` for the adapter test apps: deploys the app in the current
// directory, runs the given package.json scripts in the copy and keeps the last one running,
// then removes the copy on SIGTERM (Playwright sends it when `gracefulShutdown` is configured)
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { deploy } from './deploy.js';

const dir = process.cwd();
const { scripts } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
const app = deploy(dir);
const env = {
	...process.env,
	PATH: `${path.join(app, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`
};

const names = process.argv.slice(2);
const last = /** @type {string} */ (names.pop());
for (const name of names) {
	execSync(scripts[name], { cwd: app, env, stdio: 'inherit' });
}

const server = spawn(scripts[last], { cwd: app, env, stdio: 'inherit', shell: true });
let stopping = false;

server.on('exit', (code) => {
	fs.rmSync(app, { recursive: true, force: true });
	process.exit(stopping ? 0 : (code ?? 1));
});

process.on('SIGTERM', () => {
	stopping = true;
	server.kill('SIGTERM');
});
