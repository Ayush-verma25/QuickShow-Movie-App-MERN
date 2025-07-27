import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets } from "../assets/assets";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const { axios, getToken, user } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      } else {
        toast.error(data.message || "Failed to fetch show details");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch show details");
    }
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast.error("Please select a time first.");
    }

    if (occupiedSeats.includes(seatId)) {
      return toast.error("This seat is already booked.");
    }

    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      return toast.error("You can only select up to 5 seats.");
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          const isSelected = selectedSeats.includes(seatId);
          const isOccupied = occupiedSeats.includes(seatId);

          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              disabled={isOccupied}
              className={`h-8 w-8 rounded border border-primary/60 transition-all ${
                isSelected
                  ? "bg-primary text-white"
                  : isOccupied
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-50"
                  : "hover:bg-primary/20 cursor-pointer"
              }`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  const getOccupiedSeats = async () => {
    try {
      if (!selectedTime?.showId) {
        console.log("No showId available");
        return;
      }

      const { data } = await axios.get(
        `/api/booking/seats/${selectedTime.showId}`
      );

      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      } else {
        toast.error(data.message || "Failed to fetch occupied seats");
        setOccupiedSeats([]);
      }
    } catch (error) {
      console.log("Error fetching occupied seats:", error);
      toast.error("Failed to fetch occupied seats");
      setOccupiedSeats([]);
    }
  };

  const bookTickets = async () => {
    try {
      if (!user) {
        return toast.error("Please login to proceed");
      }

      if (!selectedTime) {
        return toast.error("Please select a time");
      }

      if (!selectedSeats || selectedSeats.length === 0) {
        return toast.error("Please select at least one seat");
      }

      if (selectedSeats.length > 5) {
        return toast.error("You can only select up to 5 seats");
      }

      setLoading(true);

      // Double-check seat availability before booking
      await getOccupiedSeats();

      const unavailableSeats = selectedSeats.filter((seat) =>
        occupiedSeats.includes(seat)
      );

      if (unavailableSeats.length > 0) {
        setLoading(false);
        return toast.error(
          `Seats ${unavailableSeats.join(", ")} are no longer available`
        );
      }

      const token = await getToken();
      if (!token) {
        setLoading(false);
        return toast.error("Authentication failed. Please login again.");
      }

      const { data } = await axios.post(
        "/api/booking/create",
        {
          showId: selectedTime.showId,
          bookedSeats: selectedSeats, // Make sure this matches backend expectation
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Booking failed");
      }
    } catch (error) {
      console.log("Booking error:", error);
      toast.error(
        error.response?.data?.message || error.message || "Booking failed"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      getShow();
    }
  }, [id]);

  useEffect(() => {
    if (selectedTime?.showId) {
      // Clear selected seats when time changes
      setSelectedSeats([]);
      getOccupiedSeats();
    }
  }, [selectedTime]);

  return show ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      {/* Available Timings */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">Available Timings</p>
        <div className="mt-5 space-y-1">
          {show.dateTime && show.dateTime[date] ? (
            show.dateTime[date].map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            ))
          ) : (
            <p className="px-6 text-sm text-gray-500">
              No timings available for this date
            </p>
          )}
        </div>
      </div>

      {/* Seat Layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0px" />
        <h1 className="text-2xl font-semibold mb-4">Select Your Seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {selectedTime ? (
          <>
            <div className="flex flex-col items-center mt-10 text-sm text-gray-300">
              <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
                {groupRows[0].map((row) => renderSeats(row))}
              </div>

              <div className="grid grid-cols-2 gap-11">
                {groupRows.slice(1).map((group, idx) => (
                  <div key={idx}>{group.map((row) => renderSeats(row))}</div>
                ))}
              </div>
            </div>

            {/* Seat Legend */}
            <div className="flex items-center gap-6 mt-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-primary/60 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span>Occupied</span>
              </div>
            </div>

            {selectedSeats.length > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Selected Seats: {selectedSeats.join(", ")} (
                  {selectedSeats.length} seat
                  {selectedSeats.length > 1 ? "s" : ""})
                </p>
              </div>
            )}

            <button
              onClick={bookTickets}
              disabled={loading || selectedSeats.length === 0}
              className={`flex items-center gap-1 mt-20 px-10 py-3 text-sm rounded-full font-medium transition ${
                loading || selectedSeats.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-dull cursor-pointer active:scale-95"
              }`}
            >
              {loading ? "Processing..." : "Proceed to Payment"}
              <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="mt-10 text-center text-gray-500">
            <p>Please select a time to view available seats</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
