import process from 'node:process';
import { prerendered } from '$app/manifest';

console.log(prerendered);

if (process.env.MY_ENV === 'MY_ENV DEFINED') {
	console.log(process.env.MY_ENV);
}
