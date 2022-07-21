const bad = foo().toUpperCase();
export default bad;

// @ts-expect-error
/** @returns {string} */
function foo() {}
