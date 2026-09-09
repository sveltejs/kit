/** @import { ChildProcess } from 'node:child_process' */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const benchmark_dir = path.dirname(fileURLToPath(import.meta.url));
export const repo_root = path.dirname(benchmark_dir);

/**
 * @param {'kit' | 'package'} name
 */
export function create_workspace(name) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), `sveltekit-benchmark-${name}-`));
	fs.rmSync(directory, { recursive: true });
	fs.cpSync(path.join(benchmark_dir, 'fixtures', name), directory, { recursive: true });

	if (name === 'kit') {
		link_package(directory, '@sveltejs/kit', path.join(repo_root, 'packages/kit'));
		link_package(
			directory,
			'@sveltejs/adapter-node',
			path.join(repo_root, 'packages/adapter-node')
		);
		link_package(directory, 'svelte', path.join(repo_root, 'packages/kit/node_modules/svelte'));
		link_package(directory, 'vite', path.join(repo_root, 'packages/kit/node_modules/vite'));
	}

	return directory;
}

/**
 * @param {string} workspace
 * @param {string} name
 * @param {string} target
 */
function link_package(workspace, name, target) {
	const destination = path.join(workspace, 'node_modules', name);
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.symlinkSync(target, destination, 'junction');
}

/**
 * @param {string} workspace
 * @param {number} count
 */
export function generate_routes(workspace, count) {
	const routes = path.join(workspace, 'src/routes/generated');
	const page = path.join(workspace, 'src/routes/+page.svelte');
	const kinds = ['static', 'nested', 'dynamic', 'optional', 'rest', 'grouped'];

	for (let index = 0; index < count; index += 1) {
		const kind = kinds[index % kinds.length];
		const base = path.join(routes, `${kind}-${index}`);
		const directory =
			kind === 'nested'
				? path.join(base, 'child')
				: kind === 'dynamic'
					? path.join(base, '[slug]')
					: kind === 'optional'
						? path.join(base, '[[lang]]')
						: kind === 'rest'
							? path.join(base, '[...path]')
							: kind === 'grouped'
								? path.join(routes, `(group-${index})`, `grouped-${index}`)
								: base;

		fs.mkdirSync(directory, { recursive: true });
		fs.copyFileSync(page, path.join(directory, '+page.svelte'));
		fs.writeFileSync(
			path.join(directory, '+page.server.js'),
			`export function load() { return { route: ${JSON.stringify(`${kind}-${index}`)} }; }\n`
		);
	}

	for (let index = 0; index < Math.ceil(count / 5); index += 1) {
		const directory = path.join(routes, `api-${index}`);
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(
			path.join(directory, '+server.js'),
			`export function GET() { return new Response(${JSON.stringify(`endpoint-${index}`)}); }\n`
		);
	}
}

/**
 * @param {string} workspace
 * @param {number} count
 */
export function generate_components(workspace, count) {
	const library = path.join(workspace, 'src/lib');
	const component = path.join(library, 'Component.svelte');

	for (let index = 0; index < count; index += 1) {
		fs.copyFileSync(component, path.join(library, `Component${index}.svelte`));
		fs.writeFileSync(
			path.join(library, `helper${index}.ts`),
			`export const value${index}: number = ${index};\n`
		);
	}

	const exports = Array.from(
		{ length: count },
		(_, index) =>
			`export { default as Component${index} } from './Component${index}.svelte';\nexport { value${index} } from './helper${index}.js';`
	);
	fs.appendFileSync(path.join(library, 'index.ts'), `\n${exports.join('\n')}\n`);
}

/**
 * @param {string} workspace
 * @param {string[]} artifacts
 */
export function remove_artifacts(workspace, artifacts) {
	for (const artifact of artifacts) {
		fs.rmSync(path.join(workspace, artifact), { force: true, recursive: true });
	}
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function run(command, args, cwd, env) {
	const child = spawn(command, args, {
		cwd,
		env: { ...process.env, NO_COLOR: '1', ...env },
		stdio: ['ignore', 'pipe', 'pipe']
	});

	let output = '';
	child.stdout.on('data', (chunk) => (output += chunk));
	child.stderr.on('data', (chunk) => (output += chunk));

	const code = await new Promise((resolve, reject) => {
		child.on('error', reject);
		child.on('exit', resolve);
	});

	if (code !== 0) {
		throw new Error(`${command} ${args.join(' ')} exited with code ${code}\n${output}`);
	}

	return output;
}

/**
 * @param {string} workspace
 */
export async function start_server(workspace) {
	const port = await get_available_port();
	const child = spawn(process.execPath, ['build/index.js'], {
		cwd: workspace,
		env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NO_COLOR: '1' },
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let output = '';
	child.stdout.on('data', (chunk) => (output += chunk));
	child.stderr.on('data', (chunk) => (output += chunk));

	const url = `http://127.0.0.1:${port}`;
	for (let attempt = 0; attempt < 100; attempt += 1) {
		if (child.exitCode !== null) {
			throw new Error(`Preview server exited with code ${child.exitCode}\n${output}`);
		}

		try {
			const response = await fetch(url);
			await response.body?.cancel();
			if (response.ok) return { child, url };
		} catch {
			// The server is not listening yet.
		}
		await new Promise((resolve) => setTimeout(resolve, 25));
	}

	await stop_server(child);
	throw new Error(`Preview server did not start\n${output}`);
}

/**
 * @param {ChildProcess} child
 */
export async function stop_server(child) {
	if (child.exitCode !== null) return;
	child.kill('SIGTERM');
	await new Promise((resolve) => child.once('exit', resolve));
}

function get_available_port() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close((error) => {
				if (error) reject(error);
				else if (address && typeof address === 'object') resolve(address.port);
				else reject(new Error('Could not allocate a port'));
			});
		});
	});
}
