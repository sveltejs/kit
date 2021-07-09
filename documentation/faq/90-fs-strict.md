---
question: "Internal server error: The request url [...] is outside of Vite serving allow list"
---

For security reasons, Vite has been configured to only allow filesystem access when the request file fulfils one of these requirements:
- Within workspace root
- Within the listed `server.fs.allow` exceptions
- Part of the dependency graph of your application code

Refer to Vite documentation for [`server.fs.allow`](https://vitejs.dev/config/#server-fs-allow) for configuration and more details.
