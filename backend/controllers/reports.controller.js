const { sendReportPhoto } = require("../security/report-files");
const { pagination } = require("../http/pagination");
const { parsePositiveId } = require("../http/validation");
const reports = require("../models/reports.model");

function reportId(value) {
  return parsePositiveId(value, {
    code: "INVALID_REPORT_ID",
    message: "Identificativo segnalazione non valido.",
  });
}

function spaceId(value) {
  return parsePositiveId(value, {
    code: "INVALID_SPACE_ID",
    message: "Identificativo spazio non valido.",
  });
}

function mapReport(row) {
  return {
    id: row.id,
    spaceId: row.spaceId,
    spaceName: row.spaceName,
    category: row.category,
    description: row.description,
    priority: row.priority,
    status: row.status,
    photo: row.hasPhoto ? "available" : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function photoFormat(photo) {
  if (!photo) return null;
  if (photo.data.length > 5 * 1024 * 1024)
    throw Object.assign(new Error("La foto supera 5 MB."), {
      status: 413,
      code: "PHOTO_TOO_LARGE",
    });
  if (photo.data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return "jpg";
  if (
    photo.data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "png";
  if (
    photo.data.subarray(0, 4).toString() === "RIFF" &&
    photo.data.subarray(8, 12).toString() === "WEBP"
  )
    return "webp";
  throw Object.assign(new Error("Il formato della foto non è valido."), {
    status: 415,
    code: "INVALID_PHOTO_FORMAT",
  });
}

async function list(request, response) {
  const { page, size } = pagination(request);
  const result = await reports.listForUser(request.user.id, page, size);
  response.json({
    data: result.rows.map(mapReport),
    pagination: {
      page,
      size,
      totalElements: result.total,
      totalPages: Math.ceil(result.total / size),
    },
  });
}

async function photo(request, response) {
  const id = reportId(request.params.reportId);
  const report = await reports.findPhotoForUser(id, request.user.id);
  if (!report || (!report.photo && !report.photoData))
    throw Object.assign(new Error("Foto non disponibile."), {
      status: 404,
      code: "PHOTO_NOT_FOUND",
    });
  await sendReportPhoto(report.photo, response, report.photoData, report.photoType);
}

async function create(request, response) {
  const id = spaceId(request.params.spaceId);
  const fields = request.body || {};
  const photo = request.file
    ? {
        filename: request.file.originalname,
        contentType: request.file.mimetype,
        data: request.file.buffer,
      }
    : null;
  const category = fields.category;
  const description =
    typeof fields.description === "string" ? fields.description.trim() : "";
  const priorities = {
    technical: "high",
    accessibility: "high",
    cleaning: "medium",
    other: "low",
  };
  if (!Object.hasOwn(priorities, category))
    throw Object.assign(new Error("La categoria non è valida."), {
      status: 400,
      code: "INVALID_REPORT_CATEGORY",
    });
  if (!description)
    throw Object.assign(new Error("La descrizione è obbligatoria."), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  const extension = photoFormat(photo);
  const row = await reports.createReport({
    userId: request.user.id,
    spaceId: id,
    category,
    description,
    photoData: photo?.data ?? null,
    photoType: extension === "jpg" ? "image/jpeg" : extension ? `image/${extension}` : null,
    createdAt: new Date().toISOString(),
  });
  if (!row)
    throw Object.assign(new Error("Lo spazio richiesto non esiste."), {
      status: 404,
      code: "SPACE_NOT_FOUND",
    });
  response.status(201).json({ data: mapReport(row) });
}

module.exports = { create, list, photo };
