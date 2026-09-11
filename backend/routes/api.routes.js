const express = require("express");
const authRouter = require("./auth.routes");
const usersRouter = require("./users.routes");
const catalogRouter = require("./catalog.routes");
const bookingsRouter = require("./bookings.routes");
const favoritesRouter = require("./favorites.routes");
const {
  router: reportsRouter,
  spaceReportsRouter,
} = require("./reports.routes");
const notificationsRouter = require("./notifications.routes");
const adminRouter = require("./admin.routes");
const router = express.Router();
router.use((request, response, next) => {
  const knownPrefixes = [
    "/auth",
    "/users",
    "/buildings",
    "/spaces",
    "/bookings",
    "/favorites",
    "/reports",
    "/notifications",
    "/admin",
  ];
  if (
    !knownPrefixes.some(
      (prefix) =>
        request.path === prefix || request.path.startsWith(`${prefix}/`),
    )
  )
    return next("router");
  next();
});
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/", catalogRouter);
router.use("/bookings", bookingsRouter);
router.use("/favorites", favoritesRouter);
router.use("/reports", reportsRouter);
router.use("/", spaceReportsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
module.exports = router;
