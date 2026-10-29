const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const controller = require("../controllers/reports.controller");
const multer = require("multer");
const router = express.Router();
router.use(requireAuth, requireRole("user"));
const spaceReportsRouter = express.Router();
spaceReportsRouter.use("/spaces", requireAuth, requireRole("user"));
const PHOTO_LIMIT_BYTES = 5 * 1024 * 1024;
const multipartUpload = multer({
  storage: multer.memoryStorage(),
  // La richiesta storica poteva contenere due campi e una foto, con circa
  // 64 KiB disponibili per l'envelope multipart oltre alla foto da 5 MiB.
  limits: {
    fileSize: PHOTO_LIMIT_BYTES,
    fieldSize: 64 * 1024,
    fields: 2,
    files: 1,
    parts: 3,
  },
});
function multipartError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}
function parseMultipart(request, response, next) {
  if (
    !/^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))$/i.test(
      request.get("Content-Type") || "",
    )
  )
    return next(
      multipartError(
        "La segnalazione richiede multipart/form-data.",
        415,
        "UNSUPPORTED_MEDIA_TYPE",
      ),
    );
  return multipartUpload.single("photo")(request, response, (error) => {
    if (!error) return next();
    if (
      error instanceof multer.MulterError &&
      [
        "LIMIT_FILE_SIZE",
        "LIMIT_FIELD_VALUE",
        "LIMIT_FIELD_KEY",
        "LIMIT_FIELD_COUNT",
        "LIMIT_PART_COUNT",
      ].includes(error.code)
    )
      return next(
        multipartError(
          "La richiesta supera il limite consentito.",
          413,
          "PHOTO_TOO_LARGE",
        ),
      );
    if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE")
      return next(
        multipartError(
          "La segnalazione contiene un campo foto non valido.",
          415,
          "UNSUPPORTED_MEDIA_TYPE",
        ),
      );
    return next(error);
  });
}
router.get("/", controller.list);
router.get("/:reportId/photo", controller.photo);
spaceReportsRouter.post(
  "/spaces/:spaceId/reports",
  parseMultipart,
  controller.create,
);
module.exports = { router, spaceReportsRouter };
