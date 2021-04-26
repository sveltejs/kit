---
title: Endpoints
---

In Sapper, 'server routes' — now referred to as [endpoints](/docs#routing-endpoints) — received the `req` and `res` objects exposed by Node's `http` module (or the augmented versions provided by frameworks like Polka and Express).

SvelteKit is designed to be agnostic as to where the app is running — it could be running on a Node server, but could equally be running on a serverless platform or in a Cloudflare Worker. For that reason, you no longer interact directly with `req` and `res`. Your endpoints will need to be updated to match the new signature.
