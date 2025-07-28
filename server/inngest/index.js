import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to the database

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.create(userData);
  }
);

// Inngest Function to Delete User from Database

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// Inngest Function to Update User data in Database

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

// Inngest Function to Cancel booking and release seats of show after 10 min of booking created if payment is not made

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {
    id: "release-seats-delete-booking",
  },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    // Wait for 10 minutes from when the event was triggered
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      try {
        // Fixed: event.data instead of event.date
        const bookingId = event.data.bookingId;

        if (!bookingId) {
          console.error("No bookingId provided in event data");
          return;
        }

        const booking = await Booking.findById(bookingId);

        // Check if booking still exists (might have been deleted already)
        if (!booking) {
          console.log(
            `Booking ${bookingId} not found, possibly already processed`
          );
          return;
        }

        // If payment is not made, release seats and cancel booking
        if (!booking.isPaid) {
          console.log(
            `Payment not completed for booking ${bookingId}, releasing seats`
          );

          const show = await Show.findById(booking.show);

          if (!show) {
            console.error(`Show not found for booking ${bookingId}`);
            return;
          }

          // Release the booked seats
          if (booking.bookedSeats && booking.bookedSeats.length > 0) {
            booking.bookedSeats.forEach((seat) => {
              if (show.occupiedSeats && show.occupiedSeats[seat]) {
                delete show.occupiedSeats[seat];
              }
            });

            show.markModified("occupiedSeats");
            await show.save();
            console.log(
              `Released ${booking.bookedSeats.length} seats for booking ${bookingId}`
            );
          }

          // Delete the booking
          await Booking.findByIdAndDelete(booking._id);
          console.log(`Booking ${bookingId} deleted successfully`);
        } else {
          console.log(
            `Payment completed for booking ${bookingId}, no action needed`
          );
        }
      } catch (error) {
        console.error("Error in check-payment-status step:", error);
        throw error; // Re-throw to mark the step as failed
      }
    });
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
];
