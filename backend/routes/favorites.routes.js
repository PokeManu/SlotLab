const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/favorites.controller");
const router = express.Router();
router.use(requireAuth, requireRole("user"));
router.get("/", controller.list);
router.post("/:spaceId", controller.add);
router.delete("/:spaceId", controller.remove);
module.exports = router;
