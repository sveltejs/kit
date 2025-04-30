import test_type from '../base.js';

const s1 = new Set([() => {}]);
const s2 = new Set([() => {}]);

export const GET = test_type(s1, s2);
