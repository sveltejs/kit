import { copy } from '../src/utils/filesystem.js';
import process from 'node:process';

const [src, dest] = process.argv.slice(2);

copy(src, dest);
