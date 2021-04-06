---
question: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. Only environment variables prefixed with `VITE_` are exposed. You would need to instantiate dotenv yourself if you want all environment variables exposed in `process.env['YOUR_ENV_VAR']`.

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
