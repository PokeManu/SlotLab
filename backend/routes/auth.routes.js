const express = require("express");
const cookieParser = require("cookie-parser");
const { requireCookieRequest } = require("../middleware/cookie-request");
const { rateLimit } = require("../middleware/rate-limit");
const {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
} = require("../controllers/auth.controller");
const router = express.Router();
router.use((request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});
router.use("/login", rateLimit({ limit: 30, windowMs: 15 * 60000 }));
router.use("/register", rateLimit({ limit: 20, windowMs: 15 * 60000 }));
router.use("/refresh", rateLimit({ limit: 120, windowMs: 15 * 60000 }));
router.use("/forgot-password", rateLimit({ limit: 5, windowMs: 15 * 60000 }));
router.use(
  "/forgot-password",
  rateLimit({
    limit: 3,
    windowMs: 60 * 60000,
    key: (request) =>
      typeof request.body?.email === "string"
        ? request.body.email.trim().toLowerCase()
        : "invalid",
  }),
);
router.post("/forgot-password", forgotPassword);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", requireCookieRequest, cookieParser(), refresh);
router.post("/logout", requireCookieRequest, cookieParser(), logout);
module.exports = router;
