const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/bookings.controller");

const router = express.Router();
router.use(requireAuth, requireRole("user"));
router.get("/", controller.listBookings);
router.get("/:bookingId", controller.bookingDetails);
router.post("/:bookingId/participants", controller.addParticipant);
router.delete(
  "/:bookingId/participants/:participantId",
  controller.removeParticipant,
);
router.delete("/:bookingId", controller.cancelBooking);
router.post("/", controller.createBooking);

module.exports = router;
