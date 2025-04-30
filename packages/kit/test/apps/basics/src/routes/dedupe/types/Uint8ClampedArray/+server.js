import test_type from '../base.js';

const u1 = new Uint8ClampedArray([1, 2, 3]);
const u2 = new Uint8ClampedArray([4, 5, 6]);

export const GET = test_type(u1, u2);
