import fs from 'node:fs';
import process from 'node:process';

fs.rmSync('test/errors.jsonl', { force: true });

if (process.platform !== 'win32') {
	fs.rmSync('src/routes/routing/symlink-from', { recursive: true, force: true });
	fs.symlinkSync('symlink-to', 'src/routes/routing/symlink-from', 'dir');
}
