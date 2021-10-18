---
question: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. Only environment variables prefixed with `VITE_` are exposed ([you can set `envPrefix` to change this](https://vitejs.dev/config/#envprefix)). You would need to instantiate dotenv yourself if you want all environment variables exposed in `process.env['YOUR_ENV_VAR']`. We hope to see all environment variables exposed on the server-side [in the future](https://github.com/vitejs/vite/issues/3176).

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
