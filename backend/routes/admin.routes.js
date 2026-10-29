const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/admin.controller");
const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.post("/announcements", adminController.createAnnouncement);
router.get("/summary", adminController.summary);
router.get("/buildings", adminController.listBuildings);
router.post("/buildings", adminController.createBuilding);
router.patch("/buildings/:buildingId", adminController.updateBuilding);
router.delete("/buildings/:buildingId", adminController.deleteBuilding);
router.get("/spaces", adminController.listSpaces);
router.get("/spaces/:spaceId", adminController.getSpace);
router.post("/spaces", adminController.createSpace);
router.patch("/spaces/:spaceId", adminController.updateSpace);
router.delete("/spaces/:spaceId", adminController.deleteSpace);
router.get("/spaces/:spaceId/availability", adminController.listAvailability);
router.post("/spaces/:spaceId/availability", adminController.createAvailability);
router.post(
  "/spaces/:spaceId/availability/:availabilityId/reuse",
  adminController.reuseAvailability,
);
router.patch(
  "/spaces/:spaceId/availability/:availabilityId",
  adminController.updateAvailability,
);
router.delete(
  "/spaces/:spaceId/availability/:availabilityId",
  adminController.deleteAvailability,
);
router.get("/spaces/:spaceId/unavailability", adminController.listUnavailability);
router.post("/spaces/:spaceId/unavailability", adminController.saveUnavailability);
router.patch(
  "/spaces/:spaceId/unavailability/:unavailabilityId",
  adminController.saveUnavailability,
);
router.delete(
  "/spaces/:spaceId/unavailability/:unavailabilityId",
  adminController.deleteUnavailability,
);
router.get("/statistics", adminController.listStatistics);
router.get("/bookings", adminController.listBookings);
router.get("/reports", adminController.listReports);
router.get("/reports/:reportId/photo", adminController.reportPhoto);
router.patch("/reports/:reportId/status", adminController.updateReportStatus);
router.get("/users", adminController.listUsers);
router.delete("/users/:userId", adminController.deleteUser);
module.exports = router;
