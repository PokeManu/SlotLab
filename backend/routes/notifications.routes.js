const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/notifications.controller");

const router = express.Router();
router.use(requireAuth, requireRole("user", "admin"));
router.get("/", controller.list);
router.patch("/read-all", controller.markAllRead);
router.patch("/:notificationId/read", controller.markRead);

module.exports = router;
