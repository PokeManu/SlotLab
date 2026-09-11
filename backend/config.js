function readConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV || "development";
  const portText = environment.PORT === undefined ? "3000" : environment.PORT;
  const port = Number(portText);
  const host = environment.HOST || "127.0.0.1";
  const jwtSecret = environment.SLOTLAB_JWT_SECRET;
  const proxyMode = environment.SLOTLAB_TRUST_PROXY || "none";
  if (!["none", "loopback"].includes(proxyMode)) {
    throw new Error("SLOTLAB_TRUST_PROXY deve essere none oppure loopback.");
  }
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(
      "NODE_ENV deve essere development, test oppure production.",
    );
  }
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port > 65535 ||
    port < (nodeEnv === "test" ? 0 : 1)
  ) {
    throw new Error(
      "PORT deve essere una porta valida; zero e ammesso solo nei test.",
    );
  }
  if (typeof jwtSecret !== "string" || !/^[a-f0-9]{64}$/i.test(jwtSecret)) {
    throw new Error(
      "Configurare SLOTLAB_JWT_SECRET con 32 byte casuali in esadecimale.",
    );
  }
  return {
    nodeEnv,
    host,
    port,
    trustProxy: proxyMode === "loopback" ? "loopback" : false,
    auth: {
      jwtSecret,
      accessTokenSeconds: 30 * 60,
      refreshTokenSeconds: 7 * 24 * 60 * 60,
      refreshCookieName: "slotlab_refresh",
      refreshCookie: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/v1/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    },
  };
}
module.exports = { readConfig };
