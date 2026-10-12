# QuickShow — Movie Ticket Booking App

QuickShow is a full-stack movie discovery and cinema ticket booking application. Visitors can browse movies and upcoming showtimes, choose seats, create a booking, and pay through Stripe Checkout. Signed-in users can view their bookings and maintain a favorites list. Administrators can add showtimes and review booking and dashboard data.

> This README describes the source in this repository. It does not contain API keys, credentials, account IDs, or production URLs. Configure your own service accounts and keep real environment files private.

## Contents

- [Features](#features)
- [Technology](#technology)
- [How the application is organized](#how-the-application-is-organized)
- [Booking and payment flow](#booking-and-payment-flow)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [API overview](#api-overview)
- [Data model](#data-model)
- [Background jobs and email](#background-jobs-and-email)
- [Deployment notes](#deployment-notes)
- [Security and project notes](#security-and-project-notes)

## Features

### Moviegoers

- Browse the home page, movie catalog, and individual movie details.
- View upcoming showtimes and choose a show date and time.
- See occupied seats and select up to five seats per booking.
- Sign in with Clerk, pay using Stripe Checkout, and view booking status and booking history.
- Save and view favorite movies.
- Receive booking-related email messages when background jobs and SMTP are configured.

### Administrators

- Open the admin dashboard (requires a Clerk user whose **private metadata** has `role: "admin"`).
- Fetch current movies from TMDB and create showtimes with a ticket price.
- Review upcoming shows, bookings, and dashboard data.

## Technology

| Area | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Lucide icons |
| Authentication | Clerk React SDK in the browser and Clerk Express middleware on the server |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| Movie catalog | TMDB API |
| Payments | Stripe Checkout and a Stripe webhook |
| Background work | Inngest event functions and scheduled jobs |
| Email | Nodemailer using an SMTP relay |

## How the application is organized

```text
.
├── client/                   # React/Vite single-page application
│   └── src/
│       ├── components/       # Shared navigation, movie, trailer, and admin UI
│       ├── context/          # Shared app state, API client, and Clerk integration
│       ├── pages/            # Public pages and admin pages
│       ├── assets/           # Static visual assets
│       └── lib/              # Date, time, and number formatters
└── server/                   # Express API and background functions
    ├── configs/              # MongoDB and SMTP setup
    ├── controllers/          # Route handlers and business logic
    ├── inngest/               # Event functions, reminders, and email jobs
    ├── middleware/           # Admin authorization
    ├── models/               # Mongoose schemas
    └── routes/                # API route definitions
```

The frontend uses the shared `AppContext` for its Axios instance, Clerk user/token access, movie shows, favorites, admin status, and the TMDB image base URL. The server connects to MongoDB at startup, installs Clerk middleware, and mounts the API routers under `/api`.

### Frontend routes

| Path | Purpose |
| --- | --- |
| `/` | Home page and featured content |
| `/movies` | Movie catalog |
| `/movies/:id` | Movie details and showtimes |
| `/movies/:id/:date` | Seat selection for a movie and date |
| `/my-bookings` | Current user's bookings and unpaid payment links |
| `/favorite` | Current user's favorite movies |
| `/loading/:nextUrl` | Payment return/loading page |
| `/admin` | Admin dashboard |
| `/admin/add-shows` | Add movies and showtimes |
| `/admin/list-shows` | List upcoming shows |
| `/admin/list-bookings` | List bookings |

## Booking and payment flow

1. The browser requests available movies and upcoming shows from the Express API.
2. The user chooses a date, showtime, and seats. The UI limits a selection to five seats and displays the seats currently reported as occupied.
3. The browser sends the show ID and selected seat IDs to `POST /api/booking/create` with a Clerk bearer token.
4. The server checks availability, creates a booking, marks seats occupied, and creates a Stripe Checkout session. It returns the checkout URL for the browser to open.
5. Stripe sends payment events to `POST /api/stripe`. The webhook verifies Stripe's signature and marks a booking paid after a successful payment event.
6. The server emits an Inngest event for a confirmation email. An unpaid booking is also scheduled for a delayed check that can release its seats.

The return URL and cancellation URL are based on the browser request's `Origin` header. Configure the deployed frontend and Stripe webhook endpoints to match the environment where the API is running.

## Getting started

### Prerequisites

- Node.js and Yarn (the repository includes Yarn lockfiles for both packages).
- A MongoDB database.
- A Clerk application configured for the frontend and backend.
- A TMDB API bearer token for server-side movie lookups.
- A Stripe account and webhook endpoint for payment flows.
- An Inngest development or production setup for background functions.
- SMTP credentials if email delivery is needed.

### Install dependencies

Open two terminals from the repository root:

```bash
cd server
 yarn install
```

```bash
cd client
yarn install
```

If your shell does not use Yarn, install the package manager or use npm; do not commit generated dependency folders.

### Configure environment variables

Create `server/.env` and `client/.env` using the variable names below. Use the examples in this README as a checklist only; never put real credentials into the README or commit real `.env` files.

### Start the API

```bash
cd server
yarn server
```

This runs the Express server with Nodemon at `http://localhost:3000`. For a non-watch start, use `yarn start`.

### Start the web app

In another terminal:

```bash
cd client
yarn dev
```

Vite prints the local web URL when it starts. The client must have a valid Clerk publishable key and its API base URL must point to the running server.

### Client build and lint

```bash
cd client
yarn build
yarn lint
```

`yarn preview` serves the generated Vite build locally. The server package provides `yarn start` and `yarn server` scripts.

## Environment configuration

### `client/.env`

| Variable | Purpose |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key used by `ClerkProvider`. |
| `VITE_BASE_URL` | Base URL for the Express API, such as the local API origin during development. |
| `VITE_TMDB_IMAGE_BASE_URL` | TMDB image URL prefix used when rendering movie posters. |
| `VITE_CURRENCY` | Currency label shown in booking and admin screens. |

### `server/.env`

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection URI. The server appends the `quickshow` database name. |
| `CLERK_SECRET_KEY` | Clerk server-side secret used by Clerk Express integration. |
| `TMDB_API_KEY` | TMDB bearer token used to retrieve movie metadata and credits. |
| `STRIPE_SECRET_KEY` | Stripe server secret used to create Checkout sessions and verify events. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook endpoint. |
| `SMTP_USER` | SMTP account username. |
| `SMTP_PASS` | SMTP account password or relay credential. |
| `SENDER_EMAIL` | Sender address used by outgoing application email. |

The code reads these names directly (or through the Clerk SDK). Do not use real values in tracked files, issue reports, screenshots, or public support requests. A Vite variable prefixed with `VITE_` is included in browser code; only put values there that are intended to be public, such as Clerk's publishable key and display configuration. Never put server secrets in `client/.env`.

## API overview

All endpoints are mounted by the Express server. Protected endpoints expect Clerk authentication; admin endpoints additionally check Clerk private metadata for the `admin` role.

| Method | Endpoint | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/` | Health response (`Server is Live!`) | Public |
| `GET` | `/api/show/now-playing` | Fetch now-playing movies from TMDB | Admin |
| `POST` | `/api/show/add` | Save movie metadata and create showtime records | Admin |
| `GET` | `/api/show/all` | List movies with upcoming shows | Public |
| `GET` | `/api/show/:movieId` | Get a movie and its upcoming showtimes grouped by date | Public |
| `POST` | `/api/booking/create` | Create a booking and Stripe Checkout session | Signed-in user |
| `GET` | `/api/booking/seats/:showId` | Return occupied seat IDs for a show | Public |
| `GET` | `/api/user/bookings` | Return bookings for the signed-in user | Signed-in user |
| `POST` | `/api/user/update-favorite` | Update the signed-in user's favorite movie IDs | Signed-in user |
| `GET` | `/api/user/favorites` | Return the signed-in user's favorite movies | Signed-in user |
| `GET` | `/api/admin/is-admin` | Check admin access | Admin |
| `GET` | `/api/admin/dashboard` | Retrieve dashboard metrics | Admin |
| `GET` | `/api/admin/all-shows` | List upcoming shows for administration | Admin |
| `GET` | `/api/admin/all-bookings` | List bookings for administration | Admin |
| `POST` | `/api/stripe` | Receive Stripe webhook events | Stripe signature required |
| `GET` / `POST` | `/api/inngest` | Inngest serve endpoint for registered functions | Inngest integration |

Authenticated browser requests use `Authorization: Bearer <Clerk session token>`. The Stripe route uses a raw request body for webhook signature verification, so it is mounted before JSON body parsing.

## Data model

| Model | Main fields and role |
| --- | --- |
| `User` | Clerk user ID as `_id`, name, email, and profile image. User records are synchronized by Clerk events through Inngest. |
| `Movie` | TMDB ID as `_id`, title, overview, poster/backdrop paths, release date, genres, cast, rating, runtime, and related metadata. |
| `Show` | Movie reference, show date/time, ticket price, and an `occupiedSeats` map keyed by seat ID. |
| `Booking` | User and show references, total amount, booked seat IDs, paid status, and Stripe payment link. |

The user favorites are stored in Clerk private metadata rather than in the MongoDB `User` schema. Movie and show records are stored in MongoDB; movie IDs are sourced from TMDB.

## Background jobs and email

The Inngest functions in `server/inngest/index.js` handle Clerk user create/update/delete synchronization, unpaid booking cleanup, booking confirmation emails, periodic show reminders, and new-show notifications. Email uses Nodemailer and the SMTP environment variables above. Inngest functions must be served by `/api/inngest` and registered with the Inngest environment used by the deployment.

## Deployment notes

The client and server each contain a `vercel.json` file, indicating separate Vercel deployment configuration. Configure each deployment's environment variables in its hosting dashboard, and set the client API base URL to the deployed server URL. Set the Stripe webhook destination to the server's `/api/stripe` endpoint and configure Inngest to reach `/api/inngest`.

The server currently sets its listening port to `3000` in `server.js`. If you deploy on a platform that injects a port or requires a serverless entry point, confirm that the deployment configuration matches the hosting platform's runtime behavior.

## Security and project notes

- Keep `.env` files out of Git. The ZIP supplied for this README contained client and server environment files; their contents have intentionally not been copied here. If any real key from those files has ever been pushed to a public or shared repository, revoke or rotate it with its provider.
- The root `.gitignore` in the supplied source only ignores `node_modules`. Before publishing, add ignore rules for `.env`, `.env.*`, and other local secret files, while keeping safe templates such as `.env.example` trackable. Check the staged files before every public push.
- Use a dedicated Stripe test configuration while developing. Never place Stripe secret or webhook keys in frontend variables.
- Clerk admin authorization is based on the user's **private** metadata role. Assign that role through a trusted Clerk administrative process, never from a client-side form.
- Seat availability is checked by the booking handler, but simultaneous requests may race unless booking creation and seat reservation are made atomic at the database level. Review concurrency behavior before using this as a production ticketing system.
- The reminder function and confirmation email code should be reviewed before relying on those features in production. The reminder query and seat-to-user extraction appear inconsistent with the `Show` schema, and the confirmation email refers to a seat property name different from the `Booking` schema.
- No automated test suite is configured in the package scripts included with this source.

## License

The server package declares the MIT license. Add a repository-level `LICENSE` file if you intend to publish the project under MIT, and confirm that the included artwork and other assets can be redistributed under your chosen license.
