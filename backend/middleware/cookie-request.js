function requireCookieRequest(request, response, next) {
  response.set("Cache-Control", "no-store");
  if (
    request.get("X-SlotLab-Request") !== "1" ||
    request.get("Sec-Fetch-Site") === "cross-site"
  ) {
    return next(
      Object.assign(new Error("Richiesta non consentita."), {
        status: 403,
        code: "FORBIDDEN",
      }),
    );
  }
  next();
}
module.exports = { requireCookieRequest };
