---
title: Auth
---

Auth refers to authentication and authorization, which are common needs when building a web application. Authentication means verifying that the user is who they say they are based on their provided credentials. Authorization means determining which actions they are allowed to take.

## Sessions vs tokens

After the user has provided their credentials such as a username and password, we want to allow them to use the application without needing to provide their credentials again for future requests. Users are commonly authenticated on subsequent requests with either a session identifier or signed token such as a JSON Web Token (JWT).

Session IDs are most commonly stored in a database. They can be immediately revoked, but require a database query to be made on each request.

In contrast, JWT generally are not checked against a datastore, which means they cannot be immediately revoked. The advantage of this method is improved latency and reduced load on your datastore.

## Integration points

Auth [cookies](@sveltejs-kit#Cookies) can be checked inside [server hooks](hooks#Server-hooks). If a user is found matching the provided credentials, the user information can be stored in [`locals`](hooks#Server-hooks-handle).

## Guides

[Lucia](https://lucia-auth.com/) is a reference for session-based web app auth. It contains example code snippets and projects for implementing session-based auth within SvelteKit and other JS projects. You can add code which follows the Lucia guide to your project with `npx sv create` when creating a new project or `npx sv add lucia` for an existing project.

An auth system is tightly coupled to a web framework because most of the code lies in validating user input, handling errors, and directing users to the appropriate next page. As a result, many of the generic JS auth libraries include one or more web frameworks within them. For this reason, many users will find it preferrable to follow a SvelteKit-specific guide such as the examples found in [Lucia](https://lucia-auth.com/) rather than having multiple web frameworks inside their project.
