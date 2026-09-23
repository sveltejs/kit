import fs from 'node:fs';
import process from 'node:process';

fs.rmSync('.svelte-kit/emulator-disposed', { force: true });

if (process.platform !== 'win32') {
	process.chdir('src/routes/routing');
	fs.rmSync('symlink-from', { recursive: true, force: true });
	fs.symlinkSync('symlink-to', 'symlink-from', 'dir');
}

try {
	fs.unlinkSync('test/errors.json');
} catch {}
