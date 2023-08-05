<p align="center" width="100%">
    <img width="20%" src="./static/logo.svg"> 
</p>

# Sveltese

Sveltese is a collection of tools and startup packages designed for the SvelteKit framework, aiming to streamline development with its expressive and efficient syntax. Our mission is to make the development process enjoyable and innovative, empowering developers to create robust and scalable applications with ease. Sveltese simplifies common tasks and enhances the SvelteKit experience by offering:

- Pre-configured, modular starter templates.
- An intuitive routing engine for seamless navigation.
- Efficient state management solutions.
- Out-of-the-box integrations with popular backend services.
- Comprehensive UI component libraries.
- Optimized build and deployment configurations.

Sveltese is user-friendly, adaptable, and equips developers with the resources needed to build and maintain large-scale applications.

## The Problem

NodeJS has come a long way since its inception, and it has become the de facto standard for building modern web applications. However, the NodeJS ecosystem is vast and fragmented, and it can be challenging to find the right tools and packages for your project. The process of setting up a new project can be time-consuming and tedious, and it often requires a steep learning curve. Furthermore, the NodeJS community is constantly evolving, and it can be difficult to keep up with the latest trends and best practices.

The builder ecosystem is as vibrany as ever. Entire companies have been built around the idea of making it easier to build and maintain web applications. This is such a thriving space.

By creating a defacto standard around the most promising tools and packages, we can make it easier for developers to get started with NodeJS and build full stack, modern web applications with all the moving parts including:

- Database
- Authentication
- Migrations
- Email
- Boilerplate
- Queueing ( coming soon )
- Caching ( coming soon )

We will focus on the best of the free solutions so that you can get up and running without having to pay for a bunch of services and hosting. We will also focus on packages that will run anywhere. We will not be focusing on packages that require a specific hosting provider.

## Requirements

Sveltese is built on top of the SvelteKit framework, and it requires the following:

- NodeJS >= 16.0.0
- SvelteKit >= 1.0.0-next.151

## Recommendations

### Postgresql

The Svetelese template is configured to use a Postgresql database, running on localhost, by default. It is a powerful, open-source relational database that is easy to use and highly scalable. It is also the most popular database for SvelteKit applications. If you are new to Postgresql, we recommend using [Homebrew](https://brew.sh/) for macOS or [PostgresSQL](https://www.postgresql.org/download/) for Windows and Linux.

You can install a postgresql database using [Homebrew](https://brew.sh/) on macOS:

```bash
$ brew install postgresql
```

#### Changing the Database

Currently the Sveltese template is configured to use a Postgresql database. If you would like to use a different database, you will need to update the `DATABASE_URL` environment variable in the `.env` file and the `schema.prisma` file.

### Prisma

Prisma is an open-source database toolkit that makes it easy to work with databases. It provides a type-safe API for building queries, and it supports multiple databases, including Postgresql, MySQL, and SQLite. It also provides a powerful migration tool that allows you to easily manage database schema changes.

Prisma is installed with the initial Sveltese template, and it is used to manage the database. You can learn more about Prisma [here](https://www.prisma.io/).

Several prisma commands have been written into the `package.json` file for convenience. You can run them using the following command:

```bash
$ pnpm run
```

### TailwindCSS

TailwindCSS is a utility-first CSS framework that makes it easy to build responsive web applications. It provides a set of utility classes that can be used to style your application, and it includes a built-in dark mode that can be enabled with a single line of code.

Tailwind is installed with the initial Sveltese template, and it is used to style the application. You can learn more about Tailwind [here](https://tailwindcss.com/).

### Lucia

## Getting Started

Sveltese is heavily inspired by Laravel. It is designed to be a complete solution for building modern web applications, and it includes everything you need to get started.

### Installation

Sveltese is available as an npm package. To install it, run the following command in your terminal:

```bash
$ degit git@github.com:sveltese/sveltese my-project
$ cd my-project
$ git init
$ pnpm install
$ cp .env.example .env


```

Open the `.env` file and update the database connection settings to match your local environment. For example:

```bash
DATABASE_URL="postgresql://sveltese:@localhost:5432/sveltese?schema=public"
```

The default databases URL is configured to use postgresql with a username sveltese and a database named sveltese. You can change those to your liking or create a database and user with those settings.

Back on the command line run the following command to initialize the database:

```bash
pnpm db:init
pnpm db:seed
```

The seed will install a test user with the following credentials:

```bash
email: test@example.com
password: password
```

Run the application using the following command:

```
pnpm dev
```

## Walkthrough

Start up the project and open it in your browser. You will see a welcome page that you can change to your liking. The welcome page is located at `src/routes/+page.svelte`.

The point of this exercise was to create something that you can spin up quickly, get some auth boilerplate, and get started building your application.

### Authentication

The Sveltese template includes a basic authentication system that allows users to register, login, and logout. It also includes a user profile page that displays the user's information.
