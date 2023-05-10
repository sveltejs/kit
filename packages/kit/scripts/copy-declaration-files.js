import { copy } from '../src/utils/filesystem.js';

copy('src', 'types', {
	filter: (file, is_directory) => is_directory || file.endsWith('.d.ts')
});
