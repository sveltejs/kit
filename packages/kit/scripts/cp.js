import { copy } from '@internal/shared/utils/filesystem.js';

const [src, dest] = process.argv.slice(2);

copy(src, dest);
