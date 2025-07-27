import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import stripe from "stripe";

// Function to check availability of selected Seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    // Add validation for selectedSeats
    if (
      !selectedSeats ||
      !Array.isArray(selectedSeats) ||
      selectedSeats.length === 0
    ) {
      console.log("Invalid selectedSeats:", selectedSeats);
      return false;
    }

    const showData = await Show.findById(showId);
    if (!showData) {
      console.log("Show not found:", showId);
      return false;
    }

    // Ensure occupiedSeats exists
    const occupiedSeats = showData.occupiedSeats || {};

    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.log("Error in checkSeatsAvailability:", error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, bookedSeats } = req.body; // Note: changed from selectedSeats to bookedSeats to match frontend
    const { origin } = req.headers;

    // Add validation
    if (!showId || !bookedSeats) {
      return res.json({
        success: false,
        message: "ShowId and bookedSeats are required.",
      });
    }

    if (!Array.isArray(bookedSeats) || bookedSeats.length === 0) {
      return res.json({
        success: false,
        message: "Please select at least one seat.",
      });
    }

    if (bookedSeats.length > 5) {
      return res.json({
        success: false,
        message: "You can only select up to 5 seats.",
      });
    }

    // Check if the Seat is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId, bookedSeats);
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected Seats are not available.",
      });
    }

    // Get the Show Details
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      return res.json({
        success: false,
        message: "Show not found.",
      });
    }

    // Create a New Booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * bookedSeats.length,
      bookedSeats: bookedSeats,
    });

    // Ensure occupiedSeats exists
    if (!showData.occupiedSeats) {
      showData.occupiedSeats = {};
    }

    // Mark seats as occupied
    bookedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");
    await showData.save();

    // Stripe Gateway Integration
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // create line items for stripe
    const line_items = [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: showData.movie.title,
          },
          unit_amount: Math.floor(booking.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now
    });

    booking.paymentLink = session.url;
    await booking.save();

    res.json({
      success: true,
      url: session.url,
      bookingId: booking._id,
    });
  } catch (error) {
    console.log("Error in createBooking:", error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    if (!showId) {
      return res.json({
        success: false,
        message: "ShowId is required.",
      });
    }

    const showData = await Show.findById(showId);

    if (!showData) {
      return res.json({
        success: false,
        message: "Show not found.",
      });
    }

    // Ensure occupiedSeats exists and get keys
    const occupiedSeats = showData.occupiedSeats
      ? Object.keys(showData.occupiedSeats)
      : [];

    res.json({
      success: true,
      occupiedSeats,
    });
  } catch (error) {
    console.log("Error in getOccupiedSeats:", error.message);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
