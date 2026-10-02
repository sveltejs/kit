import * as Kit from '@sveltejs/kit';

// Test: Return types inferred correctly and transformed into a union
type LoadReturn1 =
	| { success: true; message?: undefined }
	| { success?: undefined; message: string };

let result1: Kit.LoadProperties<LoadReturn1> = null as any;
result1.message = '';
result1.success = true;
// @ts-expect-error - cannot both be present at the same time
result1 = { message: '', success: true };
