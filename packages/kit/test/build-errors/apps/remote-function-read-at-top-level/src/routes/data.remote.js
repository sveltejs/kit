import { query, read } from '$app/server';
import testfile from './test.txt';

// This should fail without the fix because read implementation isn't set
// when remote functions are being analysed
const content = read(testfile);

export const getFile = query(() => {
	return { content };
});
