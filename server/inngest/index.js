import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodeMailer.js";

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

// Inngest Function to Sand Email when User book the Show
const sendBookingConfirmationEmail = inngest.createFunction(
  {
    id: "send-booking-confirmation-email",
    retries: 3, // Add retry configuration
  },
  {
    event: "app/show.booked",
  },
  async ({ event, step }) => {
    try {
      const { bookingId } = event.data;

      // Validate required data
      if (!bookingId) {
        throw new Error("Booking ID is required");
      }

      // Use step.run for better observability and retry handling
      const booking = await step.run("fetch-booking-details", async () => {
        const booking = await Booking.findById(bookingId)
          .populate({
            path: "show",
            populate: {
              path: "movie",
              model: "Movie",
            },
          })
          .populate("user");

        if (!booking) {
          throw new Error(`Booking not found for ID: ${bookingId}`);
        }

        if (!booking.user?.email) {
          throw new Error("User email not found for booking");
        }

        return booking;
      });

      // Format date and time with better error handling
      const formatDateTime = (dateTime) => {
        try {
          const date = new Date(dateTime);
          if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
          }
          return {
            date: date.toLocaleDateString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "long",
              year: "numeric",
            }),
            time: date.toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          };
        } catch (error) {
          console.error("Date formatting error:", error);
          return { date: "TBD", time: "TBD" };
        }
      };

      const { date, time } = formatDateTime(booking.show.showDateTime);

      // Send email with step.run for better tracking
      await step.run("send-confirmation-email", async () => {
        return await sendEmail({
          to: booking.user.email,
          subject: `Booking Confirmed: "${booking.show.movie.title}"`,
          body: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #F84565, #FF6B8A); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎬 Booking Confirmed!</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hi ${
                  booking.user.name
                },</h2>
                
                <p style="font-size: 16px; color: #555;">
                  Great news! Your booking for 
                  <strong style="color: #F84565;">"${
                    booking.show.movie.title
                  }"</strong> 
                  has been confirmed successfully.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F84565;">
                  <h3 style="color: #333; margin-top: 0;">📅 Show Details</h3>
                  <p style="margin: 5px 0;"><strong>Movie:</strong> ${
                    booking.show.movie.title
                  }</p>
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
                  <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${
                    booking._id
                  }</p>
                  ${
                    booking.seats
                      ? `<p style="margin: 5px 0;"><strong>Seats:</strong> ${
                          Array.isArray(booking.seats)
                            ? booking.seats.join(", ")
                            : booking.seats
                        }</p>`
                      : ""
                  }
                </div>
                
                <div style="background: #E8F5E8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #2D5D2D;">
                    <strong>💡 Pro Tip:</strong> Please arrive 15 minutes before the show time. 
                    Don't forget to bring a valid ID for verification.
                  </p>
                </div>
                
                <p style="font-size: 18px; text-align: center; margin: 30px 0;">
                  Enjoy the show! 🍿🎭
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #666; font-size: 14px; text-align: center; margin: 0;">
                  Thanks for choosing QuickShow!<br/>
                  <strong>QuickShow Movie App Team</strong>
                </p>
              </div>
            </div>
          `,
        });
      });

      console.log(
        `Booking confirmation email sent successfully for booking ${bookingId}`
      );
    } catch (error) {
      console.error("Error sending booking confirmation email:", error);
      throw error; // Re-throw to trigger Inngest retry mechanism
    }
  }
);

// Inngest function to send reminders
const sendShowReminders = inngest.createFunction(
  {
    id: "send-show-reminders",
  },
  { cron: "0 */8 * * *" }, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours },
      }).populate("movie");
      const tasks = [];

      for (const show of shows) {
        if (!show.movie || !show.movie.title) continue;

        const userIds = [...new set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        const users = await User.find({ _id: { $in: userIds } }).select(
          "name email"
        );

        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          });
        }
      }
      return tasks;
    });
    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send" };
    }
    // send reminder email
    const results = await step.run("send-all-reminders", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
            body: `<div style="font-family: Arial, sans-serif; padding: 20px;"> <h2>Hello ${
              task.userName
            },</h2>
            <p>This is a quick reminder that your movie:</p>
            <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
            <p>
            is scheduled for <strong>${new Date(task.showTime).toLocaleString(
              "en-US",
              { timeZone: "Asia/Kolkata" }
            )}</strong> at
            <strong>${new Date(task.showTime).toLocaleTimeString("en-US", {
              timeZone: "Asia/Kolkata",
            })}</strong>.
            </p>
            <p>It Starts in approximetaly <strong>8 hours</strong> - make sure you're ready!</p>
            <br/>
            <p>Enjoy the show!<br/>QuickShow Movie App Team</p>
            </div>`,
          })
        )
      );
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return { sent, failed, message: `${sent} reminders(s), ${failed} failed.` };
  }
);

// Inngest Finction to send notifications when a new show is added

const sendNewShowNotifications = inngest.createFunction(
  {
    id: "send-new-show-notifications",
  },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;

    const users = await User.find({});

    for (const user of users) {
      const userEmail = user.email;
      const userName = user.name;

      const subject = `🎬 New Show Added: ${movieTitle}`;
      const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello ${userName},</h2>
      <p>We've just added a new show to our library:</p>
      <h3 style="color: #F84565;">"${movieTitle}"</h3>
      <p>Visit our website</p>
      <br/>
      <p>Thanks,<br/>QuickShow Movie App Team</p>
    </div>`;

      await sendEmail({
        to: userEmail,
        subject,
        body,
      });
    }

    return { nessage: "Notifications sent." };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
];
