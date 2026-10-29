const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rate-limit");
const {
  getCurrentUser,
  getProfilePhoto,
  putProfilePhoto,
  deleteProfilePhoto,
  changePassword,
  deleteAccount,
} = require("../controllers/users.controller");
const accountLimit = rateLimit({
  limit: 10,
  windowMs: 15 * 60000,
  key: (request) => request.user.id,
});
const router = express.Router();
router.get(
  "/me",
  requireAuth,
  requireRole("user", "admin"),
  getCurrentUser,
);
router.get(
  "/me/photo",
  requireAuth,
  requireRole("user", "admin"),
  getProfilePhoto,
);
router.put(
  "/me/photo",
  requireAuth,
  requireRole("user", "admin"),
  accountLimit,
  putProfilePhoto,
);
router.delete(
  "/me/photo",
  requireAuth,
  requireRole("user", "admin"),
  accountLimit,
  deleteProfilePhoto,
);
router.patch(
  "/me/password",
  requireAuth,
  requireRole("user", "admin"),
  accountLimit,
  changePassword,
);
router.delete(
  "/me",
  requireAuth,
  requireRole("user"),
  accountLimit,
  deleteAccount,
);
module.exports = router;
