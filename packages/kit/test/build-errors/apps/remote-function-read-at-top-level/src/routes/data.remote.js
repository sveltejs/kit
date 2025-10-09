import { prerender, read } from '$app/server';
import testfile from './test.txt';

// This should fail without the fix because read implementation isn't set
// when remote functions are being analysed during build
const content = read(testfile);

export const getData = prerender(() => {
	return { text: content };
});
