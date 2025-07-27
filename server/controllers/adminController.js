import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

// API to Check if user is Admin
export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// API to get dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true }).lean();
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .lean();

    // Use countDocuments() properly - it returns a promise
    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to Get All Shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 })
      .lean(); // Add .lean() to get plain JavaScript objects

    res.json({ success: true, shows });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to Get All Bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user")
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 })
      .lean(); // Add .lean() to get plain JavaScript objects

    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
