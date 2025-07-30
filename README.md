# 🎬 QuickShow - Movie Ticket Booking App (MERN)

Welcome to **QuickShow**, a full-stack, fully-functional **Movie Ticket Booking App** built using the **MERN** stack with modern technologies like **Vite**, **Clerk**, **Stripe**, and **Inngest**. QuickShow allows users to browse, book, and manage movie tickets with a seamless experience across devices.

---

## 🚀 Live Demo

**Frontend:** [https://quickshow-movie-app-mern-client.vercel.app/](https://quickshow-movie-app-mern-client.vercel.app/)  
**Backend/API:** [https://quickshow-movie-app-mern-server.vercel.app/](https://quickshow-movie-app-mern-server.vercel.app/)

> 💡 Both frontend and backend are deployed on **Vercel** for blazing-fast performance.

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React (Vite) + JavaScript           |
| Backend     | Node.js + Express                   |
| Database    | MongoDB                             |
| Auth        | Clerk                               |
| Payments    | Stripe                              |
| Queue/Jobs  | Inngest (for background workflows)  |
| Deployment  | Vercel (both frontend & backend)    |

---

## 📸 Features

- 🧾 **User Authentication** via Clerk
- 🎞️ Browse available movies and upcoming shows
- 🎟️ Book seats with real-time availability check
- 💳 **Stripe-powered** secure payments
- 🕒 Booking history and user dashboard
- 📬 Email notifications (via Inngest workflows)
- 👨‍💻 Admin support for adding shows (WIP)
- ⚡ Fast UI powered by React + Vite

---

## 🔧 Project Structure

quickshow-movie-app-mern/
├── client/ # Vite React frontend
│ └── src/
│ └── components/
│ └── pages/
│ └── services/
│ └── utils/
├── server/ # Express backend
│ └── controllers/
│ └── models/
│ └── routes/
│ └── utils/
│ └── inngest/ # Inngest event workflows

yaml
Copy
Edit

---

## 💻 Local Development

Setup Environment Variables
Create .env files in both client/ and server/ with the necessary keys:

For client/.env:
env
Copy
Edit
VITE_CLERK_PUBLISHABLE_KEY=your_key
VITE_BACKEND_URL=http://localhost:8000
For server/.env:
env
Copy
Edit
PORT=8000
MONGO_URI=your_mongodb_uri
CLERK_SECRET_KEY=your_key
STRIPE_SECRET_KEY=your_stripe_key

Start the Development Servers
Frontend (React + Vite)
bash
Copy
Edit
cd client
npm install
npm run dev

Backend (Express + Node)
bash
Copy
Edit
cd ../server
npm install
npm run dev

🔐 Authentication
QuickShow uses Clerk for authentication and user management. New users can sign up, sign in, and manage their profiles seamlessly.

💸 Payments
Payments are handled via Stripe. Users can securely checkout using their cards, and Stripe Webhooks ensure real-time updates on transaction statuses.

📩 Background Jobs & Events
Inngest handles event-driven workflows like:

Sending confirmation emails

Booking timeouts or expirations

Webhook retries

📦 API Endpoints
API endpoints are available under:
/api/v1/

Key endpoints:

POST /api/v1/auth/

GET /api/v1/movies/

POST /api/v1/booking/

POST /api/v1/payment/create-checkout-session

Full API documentation (Postman/Swagger) coming soon.

✅ To-Do (Upcoming Features)
🎫 QR Code ticket generation

🧑‍💼 Admin dashboard (Add/edit/delete movies & shows)

🗺️ Seat map UI improvements

📱 PWA support for mobile use

📷 Screenshots
Add relevant screenshots here (UI, booking flow, payment, etc.)

🤝 Contribution
Pull requests are welcome! For major changes, please open an issue first to discuss what you’d like to change or improve.

🧑‍💻 Author
Made with ❤️ by Ayush Verma
Connect on LinkedIn

📄 License
This project is licensed under the MIT License.
