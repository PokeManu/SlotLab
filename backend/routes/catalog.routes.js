const express = require("express");
const { rateLimit } = require("../middleware/rate-limit");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/catalog.controller");

const router = express.Router();
router.use(["/buildings", "/spaces"], requireAuth, requireRole("user"));
router.get("/buildings", controller.listBuildings);
router.post(
  "/spaces/:spaceId/check-in",
  rateLimit({ limit: 30, windowMs: 60000, key: (request) => request.user.id }),
  controller.checkIn,
);
router.get("/spaces/:spaceId/availability", controller.spaceAvailability);
router.get("/spaces", controller.listSpaces);
router.get("/spaces/recommended", controller.recommendedSpaces);
router.get("/spaces/:spaceId", controller.spaceDetails);

module.exports = router;
