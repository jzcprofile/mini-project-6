# Commonplace Blog — React, EJS + Node.js

The project has two frontends sharing an Express backend, PostgreSQL database, and authenticated sessions:

- The React single-page app uses the JSON API.
- The EJS edition provides server-rendered signup, sign-in, feed, post editor, and account pages.

Visitors can read posts; authenticated users can publish, edit/delete their own posts, and update account details. Passwords are stored as bcrypt hashes and sessions are stored in PostgreSQL. The database uses `users(user_id, password, name)` and `blogs(blog_id, creator_name, creator_user_id, title, body, date_created)`; blog ownership is enforced in database queries.

## Database setup

1. Install Node.js and PostgreSQL. Create a database named `BlogDB` in pgAdmin.
2. In pgAdmin, open the Query Tool for `BlogDB` and execute [`db/schema.sql`](./db/schema.sql). It creates the `users` and `blogs` tables, five starter posts, and three sample accounts. The seed portion can be run again without duplicating its sample rows.

## Start the application

Install dependencies from this directory:

```powershell
npm.cmd install
```

Set a PostgreSQL connection URL and a private session secret. The format is shown in [`.env.example`](./.env.example). For example:

```powershell
$env:DATABASE_URL = "postgres://postgres:your_password@localhost:5432/BlogDB"
$env:SESSION_SECRET = "replace-with-a-long-random-secret"
npm.cmd run dev
```

Open the Vite React frontend at <http://localhost:5173>. Vite proxies `/api` requests to Express on port 3000.

The EJS edition is served from the same Express server at <http://localhost:3000/classic>. Its signup and sign-in pages are at `/classic/signup` and `/classic/signin`. It shares accounts, posts, and sessions with the React app.

For production, build the React frontend and start the Express server:

```powershell
npm.cmd run build
$env:NODE_ENV = "production"
npm.cmd start
```

Production must use a private `SESSION_SECRET` and HTTPS.

## Sample accounts

| User ID | Password |
| --- | --- |
| `maya` | `MayaBlog2026!` |
| `noah` | `NoahBlog2026!` |
| `amina` | `AminaBlog2026!` |

These are local coursework/demo credentials only; change or remove them before deploying publicly.

## API endpoints

All API responses use JSON and the browser session cookie for authentication.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth` | Get current signed-in user |
| `POST` | `/api/signup` | Create an account |
| `POST` | `/api/signin` | Sign in |
| `POST` | `/api/signout` | Sign out |
| `GET` | `/api/blogs` | Read the feed |
| `POST` | `/api/blogs` | Create a post |
| `GET` | `/api/blogs/:id` | Load an owned post for editing |
| `PUT` | `/api/blogs/:id` | Update an owned post |
| `DELETE` | `/api/blogs/:id` | Delete an owned post |
| `PUT` | `/api/account` | Update account ID, name, or password |

React components are in `client/src/components`. Run `npm.cmd test` for API/session and SPA route checks, and `npm.cmd run build` to build production assets.

EJS templates are in `views/classic`, with their responsive stylesheet in `public/classic/style.css`. The `/classic` routes use normal HTML form submissions, while `/api` routes remain JSON endpoints for React.
