const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
function photoError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}
function detectPhotoType(data) {
  if (data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return "image/jpeg";
  if (
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    data.subarray(0, 4).toString() === "RIFF" &&
    data.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  throw photoError(
    "Il formato della foto non è valido.",
    415,
    "INVALID_PROFILE_PHOTO_FORMAT",
  );
}
function readProfilePhoto(request) {
  const declaredType = (request.get("Content-Type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(declaredType)) {
    throw photoError(
      "Sono ammesse soltanto immagini JPEG, PNG o WebP.",
      415,
      "INVALID_PROFILE_PHOTO_FORMAT",
    );
  }
  const contentLength = Number(request.get("Content-Length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PROFILE_PHOTO_BYTES
  ) {
    throw photoError(
      "La foto profilo supera 2 MB.",
      413,
      "PROFILE_PHOTO_TOO_LARGE",
    );
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let rejected = false;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_PROFILE_PHOTO_BYTES) {
        rejected = true;
        chunks.length = 0;
        reject(
          photoError(
            "La foto profilo supera 2 MB.",
            413,
            "PROFILE_PHOTO_TOO_LARGE",
          ),
        );
        return;
      }
      if (!rejected) chunks.push(chunk);
    });
    request.on("error", reject);
    request.on("end", () => {
      if (rejected) return;
      const data = Buffer.concat(chunks);
      if (data.length === 0)
        return reject(
          photoError("La foto profilo è vuota.", 400, "EMPTY_PROFILE_PHOTO"),
        );
      const detectedType = detectPhotoType(data);
      if (detectedType !== declaredType) {
        return reject(
          photoError(
            "Il contenuto non corrisponde al formato dichiarato.",
            415,
            "INVALID_PROFILE_PHOTO_FORMAT",
          ),
        );
      }
      resolve({ data, type: detectedType });
    });
  });
}
module.exports = { MAX_PROFILE_PHOTO_BYTES, detectPhotoType, readProfilePhoto };
