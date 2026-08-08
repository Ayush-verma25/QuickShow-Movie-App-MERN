# 🎬 QuickShow — MERN Movie Ticket Booking Platform

QuickShow is a full-stack movie ticket booking application built with the **MERN stack**. It provides a modern movie discovery and ticket-booking experience with **seat selection, Stripe payments, Clerk authentication, TMDB movie data, booking history, favorites, automated booking emails, and an admin dashboard** for managing shows and bookings.

The project is split into a React/Vite frontend and an Express/Node.js backend backed by MongoDB.

---

## ✨ Features

### 👤 User Features

- Browse currently available movies and upcoming shows
- View movie details, ratings, runtime, genres, cast, and overview
- Select a date and available showtime
- Interactive cinema seat layout
- Real-time occupied-seat checking before booking
- Select up to 5 seats per booking
- Secure checkout through **Stripe**
- View personal booking history
- Add/remove movies from favorites
- Clerk-based authentication
- Booking confirmation email after successful payment
- Responsive movie-booking UI

### 🛠️ Admin Features

- Protected admin dashboard
- Dashboard statistics:
  - Total bookings
  - Total revenue
  - Active shows
  - Total users
- Add new movie shows
- Select a movie directly from TMDB's now-playing catalog
- Set ticket/show price
- Add multiple dates and showtimes
- View upcoming shows
- View all customer bookings
- Admin authorization through Clerk private metadata

### ⚙️ Backend & Automation

- REST API using Express.js
- MongoDB persistence with Mongoose
- Clerk authentication and user synchronization
- TMDB API integration for movie data
- Stripe Checkout integration
- Stripe webhook handling for successful payments
- Inngest background jobs for:
  - Clerk user synchronization
  - Unpaid booking cleanup
  - Automatic seat release
  - Booking confirmation emails
- Nodemailer email integration
- CORS and environment-based configuration

---

## 🧰 Tech Stack

### Frontend

- **React 19**
- **Vite**
- **React Router**
- **Tailwind CSS**
- **Axios**
- **Clerk React**
- **Lucide React**
- **React Hot Toast**
- **React Player**

### Backend

- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **Clerk Express**
- **Stripe**
- **Inngest**
- **Nodemailer**
- **Axios**
- **dotenv**
- **CORS**

### External Services

| Service | Purpose |
|---|---|
| TMDB | Movie, poster, cast and now-playing data |
| Clerk | Authentication and user/admin identity |
| Stripe | Online ticket payments |
| Inngest | Background jobs and booking/payment workflows |
| SMTP / Nodemailer | Booking confirmation emails |
| MongoDB | Application database |

---

## 🏗️ Application Architecture

```text
QuickShow
│
├── client/                         # React + Vite frontend
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   └── admin/
│       ├── context/
│       ├── lib/
│       └── pages/
│           ├── admin/
│           │   ├── AddShows.jsx
│           │   ├── Dashboard.jsx
│           │   ├── Layout.jsx
│           │   ├── ListBookings.jsx
│           │   └── ListShows.jsx
│           ├── Favorite.jsx
│           ├── Home.jsx
│           ├── MovieDetails.jsx
│           ├── Movies.jsx
│           ├── MyBookings.jsx
│           └── SeatLayout.jsx
│
└── server/                         # Node + Express backend
    ├── configs/
    ├── controllers/
    ├── inngest/
    ├── middleware/
    ├── models/
    ├── routes/
    └── server.js
```

---

## 🔄 Booking Flow

```text
User
 │
 ├── Sign in with Clerk
 │
 ├── Browse Movies
 │
 ├── Select Movie
 │
 ├── Select Date & Showtime
 │
 ├── Select Seats
 │
 ├── Backend validates seat availability
 │
 ├── Booking created as unpaid
 │
 ├── Seats temporarily marked occupied
 │
 └── Stripe Checkout
       │
       ├── Payment Successful
       │      ├── Stripe Webhook
       │      ├── Booking marked as paid
       │      └── Inngest sends confirmation email
       │
       └── Payment Not Completed
              └── Inngest releases seats and removes unpaid booking
```

---

## 🗄️ Data Models

### User

Stores synchronized Clerk user information.

```text
User
├── _id
├── name
├── email
└── image
```

### Movie

Stores movie information retrieved from TMDB.

```text
Movie
├── _id
├── title
├── overview
├── poster_path
├── backdrop_path
├── release_date
├── original_language
├── tagline
├── genres
├── casts
├── vote_average
└── runtime
```

### Show

Represents a scheduled movie screening.

```text
Show
├── movie
├── showDateTime
├── showPrice
└── occupiedSeats
```

### Booking

Stores ticket booking and payment information.

```text
Booking
├── user
├── show
├── amount
├── bookedSeats
├── isPaid
├── paymentLink
└── timestamps
```

---

## 🔐 Authentication & Authorization

QuickShow uses **Clerk** for authentication.

The application supports:

- User sign-in/sign-up
- Clerk session tokens
- Backend authentication middleware
- Admin authorization through Clerk `privateMetadata`
- Protected admin routes

An administrator is identified using:

```text
privateMetadata.role = "admin"
```

---

## 💳 Stripe Payment Integration

QuickShow uses **Stripe Checkout** for online ticket payments.

The booking flow is:

1. User selects available seats.
2. Backend validates the requested seats.
3. Booking is created.
4. Stripe Checkout Session is generated.
5. User completes payment on Stripe.
6. Stripe sends a webhook to the backend.
7. The booking is marked as paid.
8. An Inngest event triggers the confirmation email workflow.

The Stripe webhook endpoint is:

```text
POST /api/stripe
```

> For production, configure the Stripe webhook endpoint in the Stripe Dashboard and use the generated webhook signing secret in the server environment.

---

## ⏱️ Automated Booking Cleanup

QuickShow uses **Inngest** to handle unpaid bookings.

When a booking is created:

```text
Booking Created
      ↓
Inngest Event
      ↓
Wait 10 Minutes
      ↓
Check Payment Status
      ↓
 ┌───────────────┐
 │               │
Paid          Unpaid
 │               │
Keep booking   Release seats
               Delete booking
```

This prevents unpaid reservations from permanently blocking seats.

---

## 📧 Booking Confirmation Emails

After Stripe confirms successful payment:

```text
Stripe Webhook
      ↓
Booking marked as paid
      ↓
Inngest event: app/show.booked
      ↓
Fetch booking details
      ↓
Send confirmation email
```

The email includes movie information, date, time, booking ID, and booking details.

---

## 🌐 API Overview

### Show APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/show/all` | Get upcoming movies/shows |
| GET | `/api/show/:movieId` | Get showtimes for a movie |
| GET | `/api/show/now-playing` | Get TMDB now-playing movies |
| POST | `/api/show/add` | Add movie shows |

### Booking APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/booking/create` | Create booking and Stripe Checkout Session |
| GET | `/api/booking/seats/:showId` | Get occupied seats |

### User APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/bookings` | Get logged-in user's bookings |
| POST | `/api/user/update-favorite` | Add/remove favorite movie |
| GET | `/api/user/favorites` | Get favorite movies |

### Admin APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/is-admin` | Check admin access |
| GET | `/api/admin/dashboard` | Get dashboard statistics |
| GET | `/api/admin/all-shows` | Get upcoming shows |
| GET | `/api/admin/all-bookings` | Get all bookings |

### Payment

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/stripe` | Stripe webhook |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Ayush-verma25/QuickShow-Movie-Ticket-Booking-App.git
cd QuickShow-Movie-Ticket-Booking-App
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
```

### 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

---

## 🔑 Environment Variables

### Client

Create:

```text
client/.env
```

Add:

```env
VITE_CURRENCY=₹
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_BASE_URL=http://localhost:3000
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original
```

### Server

Create:

```text
server/.env
```

Add:

```env
MONGODB_URI=your_mongodb_connection_string

CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

TMDB_API_KEY=your_tmdb_bearer_token

STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

SENDER_EMAIL=your_sender_email
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

> Never commit real API keys, Stripe secrets, Clerk secrets, database credentials, SMTP passwords, or webhook secrets to GitHub. The project `.gitignore` files are configured to ignore `.env` files.

---

## ▶️ Run the Application

### Start Backend

```bash
cd server
npm run server
```

Backend runs on:

```text
http://localhost:3000
```

### Start Frontend

In another terminal:

```bash
cd client
npm run dev
```

Vite will provide the local frontend URL in the terminal.

---

## 👨‍💼 Admin Setup

After creating/signing in with a Clerk user, assign the following private metadata:

```json
{
  "role": "admin"
}
```

The admin can then access:

```text
/admin
```

Available admin sections:

```text
/admin
/admin/add-shows
/admin/list-shows
/admin/list-bookings
```

---

## 🧪 Production Considerations

Before deploying this project to production, consider adding:

- Atomic/transaction-based seat reservation to prevent race conditions
- Stronger request validation with a schema validation library
- Explicit authentication middleware on every user-specific API route
- Rate limiting and security headers
- Pagination for admin bookings and shows
- Database indexes for frequently queried fields
- Better payment-state handling for expired Stripe sessions
- Idempotent Stripe webhook processing
- Centralized error-handling middleware
- Structured logging
- Automated tests for booking, payment, and seat-reservation flows
- Production CORS configuration instead of broad development CORS
- Secure cookie/token strategy where appropriate
- Monitoring for Stripe and Inngest failures

---

## 📌 Key Technical Highlights

This project demonstrates practical full-stack development concepts including:

- MERN architecture
- React component-based UI development
- REST API design
- MongoDB data modeling
- Mongoose population and queries
- Authentication and role-based authorization
- Third-party API integration
- Interactive seat-selection logic
- Payment gateway integration
- Stripe webhook verification
- Background job processing
- Automated transactional emails
- Environment-based configuration
- Admin dashboard development
- Responsive UI implementation
- Frontend/backend separation

---

## 💼 Resume Project Description

**QuickShow — MERN Movie Ticket Booking Platform**

> Developed a full-stack movie ticket booking platform using React.js, Node.js, Express.js, and MongoDB with Clerk authentication and Stripe Checkout integration. Implemented interactive seat selection with availability validation, admin show management, booking history, favorites, TMDB movie integration, Stripe webhook-based payment confirmation, and Inngest-powered automated seat release and booking confirmation emails.

### Suggested Resume Keywords

```text
MERN Stack
React.js
Node.js
Express.js
MongoDB
Mongoose
REST APIs
Stripe
Payment Gateway
Stripe Webhooks
Clerk Authentication
Role-Based Authorization
TMDB API
Inngest
Nodemailer
Seat Reservation
Movie Ticket Booking
Admin Dashboard
API Integration
Third-Party API Integration
Asynchronous Jobs
Responsive UI
```

---

## 📷 Screenshots

Add screenshots/GIFs of the following sections to make the GitHub repository more attractive:

- Home page
- Movie details page
- Seat selection page
- Stripe checkout flow
- My bookings page
- Favorites page
- Admin dashboard
- Add shows page
- List shows page
- List bookings page

Example:

```md
## Screenshots

### Home
![QuickShow Home](./screenshots/home.png)

### Seat Selection
![Seat Selection](./screenshots/seat-selection.png)

### Admin Dashboard
![Admin Dashboard](./screenshots/admin-dashboard.png)
```

---

## 📁 Repository Structure

```text
QuickShow-Movie-Ticket-Booking-App/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── configs/
│   ├── controllers/
│   ├── inngest/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── package.json
│   └── server.js
│
└── README.md
```

---

## 👨‍💻 Author

**Ayush Verma**

MERN Stack / Full Stack Developer

GitHub: [Ayush-verma25](https://github.com/Ayush-verma25)

---

## 📄 License

This project is available under the **MIT License**.
