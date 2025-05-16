import test_type from '../base.js';

const m1 = new Map([[1, () => {}]]);
const m2 = new Map([[1, () => {}]]);

export const GET = test_type(m1, m2);
