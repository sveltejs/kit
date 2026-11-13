---
title: Auth
---

Auth refers to authentication and authorization, which are common needs when building a web application. Authentication means verifying that the user is who they say they are based on their provided credentials. Authorization means determining which actions they are allowed to take.

## Sessions vs tokens

After the user has provided their credentials such as a username and password, we want to allow them to use the application without needing to provide their credentials again for future requests. Users are commonly authenticated on subsequent requests with either a session identifier or signed token such as a JSON Web Token (JWT).

Session IDs are most commonly stored in a database. They can be immediately revoked, but require a database query to be made on each request.

In contrast, JWT generally are not checked against a datastore, which means they cannot be immediately revoked. The advantage of this method is improved latency and reduced load on your datastore.

## Integration points

Auth [cookies](@sveltejs-kit#Cookies) can be checked inside the [`handle`](hooks#handle) hook. If a user is found matching the provided credentials, the user information can be stored in [`locals`](hooks#handle-locals).

## Libraries

The [Svelte CLI](/docs/cli) gives the option to [set up Better Auth](/docs/cli/better-auth) with a new project or add it to an existing project.

## Guides

If you'd like to implement your own auth system, [Pilcrow's Auth Book](https://auth.pilcrowonpaper.com/) provides a reference for session-based web app auth . There's also a [simple example](https://github.com/lucia-auth/lucia/blob/main/code/auth_session.ts) of how to implement this generally.
