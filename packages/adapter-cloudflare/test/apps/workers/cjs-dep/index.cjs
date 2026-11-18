// A CommonJS module that require()s a Node builtin, like node-forge does.
// Bundling this must not emit `createRequire(import.meta.url)` because
// `import.meta.url` is undefined in workerd https://github.com/sveltejs/kit/issues/15960
const crypto = require('node:crypto');

module.exports.token = () => crypto.randomBytes(8).toString('hex');
