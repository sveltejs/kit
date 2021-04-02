const adapter = require(process.env.ADAPTER || '@sveltejs/adapter-node');
const options = JSON.stringify(process.env.OPTIONS || '{}');

module.exports = {
	kit: {
		adapter: adapter(options),
		target: '#svelte'
	}
};
