import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const submissionsFile = path.join(dataDir, "submissions.json");
const cashierFile = path.join(dataDir, "cashier.json");
const statisticsFile = path.join(dataDir, "statistics.json");

loadDotEnv();

const port = Number(process.env.PORT || 3000);
const staffPassword = process.env.STAFF_PASSWORD || "change-this-password";
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const defaultCashier = {
  offers: [
    { id: "coffee", name: "Kaffee", priceCents: 150, sold: 0 },
    { id: "water", name: "Wasser", priceCents: 100, sold: 0 },
    { id: "snack", name: "Snack", priceCents: 200, sold: 0 }
  ],
  updatedAt: null
};

await ensureDataFiles();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Something went wrong." });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Juze Theke running at http://localhost:${port}`);
});

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/customer-submissions") {
    const body = await readJsonBody(req);
    const entry = {
      id: randomUUID(),
      visitDate: cleanText(body.visitDate, 20),
      visitTime: cleanText(body.visitTime, 20),
      roomType: cleanText(body.roomType, 120),
      mainVisitor: cleanText(body.mainVisitor, 120),
      guests: cleanText(body.guests, 1200),
      createdAt: new Date().toISOString()
    };

    if (!entry.visitDate || !entry.visitTime || !entry.roomType || !entry.mainVisitor) {
      sendJson(res, 400, { error: "Date, time, room type and main visitor are required." });
      return;
    }

    const submissions = await readJson(submissionsFile, []);
    submissions.unshift(entry);
    await writeJson(submissionsFile, submissions);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJsonBody(req);
    if (!constantTimeEqual(String(body.password || ""), staffPassword)) {
      sendJson(res, 401, { error: "Wrong password." });
      return;
    }

    const value = signSession();
    res.setHeader("Set-Cookie", `juze_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    res.setHeader("Set-Cookie", "juze_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname.startsWith("/api/staff/") && !isAuthenticated(req)) {
    sendJson(res, 401, { error: "Login required." });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/staff/submissions") {
    sendJson(res, 200, await readJson(submissionsFile, []));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/staff/cashier") {
    sendJson(res, 200, await readJson(cashierFile, defaultCashier));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/staff/statistics") {
    sendJson(res, 200, await readJson(statisticsFile, []));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/staff/statistics") {
    const body = await readJsonBody(req);
    const entry = {
      id: randomUUID(),
      ageGroup: cleanText(body.ageGroup, 20),
      gender: cleanText(body.gender, 80),
      quantity: Math.max(1, Math.round(Number(body.quantity) || 1)),
      note: cleanText(body.note, 1200),
      createdAt: new Date().toISOString()
    };

    if (!entry.ageGroup || !entry.gender) {
      sendJson(res, 400, { error: "Age group and gender are required." });
      return;
    }

    const statistics = await readJson(statisticsFile, []);
    statistics.unshift(entry);
    await writeJson(statisticsFile, statistics);
    sendJson(res, 201, entry);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/staff/cashier") {
    const body = await readJsonBody(req);
    const offers = Array.isArray(body.offers) ? body.offers : [];
    const next = {
      offers: offers
        .map((offer) => ({
          id: cleanText(offer.id, 80) || randomUUID(),
          name: cleanText(offer.name, 120),
          priceCents: Math.max(0, Math.round(Number(offer.priceCents) || 0)),
          sold: Math.max(0, Math.round(Number(offer.sold) || 0))
        }))
        .filter((offer) => offer.name),
      updatedAt: new Date().toISOString()
    };
    await writeJson(cashierFile, next);
    sendJson(res, 200, next);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/staff/cashier/reset") {
    const cashier = await readJson(cashierFile, defaultCashier);
    const next = {
      offers: cashier.offers.map((offer) => ({ ...offer, sold: 0 })),
      updatedAt: new Date().toISOString()
    };
    await writeJson(cashierFile, next);
    sendJson(res, 200, next);
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function loadDotEnv() {
  try {
    const file = path.join(__dirname, ".env");
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = valueParts.join("=").trim();
    }
  } catch {
    // A missing .env is fine for local first-run development.
  }
}

async function ensureDataFiles() {
  await mkdir(dataDir, { recursive: true });
  await ensureJsonFile(submissionsFile, []);
  await ensureJsonFile(cashierFile, defaultCashier);
  await ensureJsonFile(statisticsFile, []);
}

async function ensureJsonFile(file, fallback) {
  try {
    await stat(file);
  } catch {
    await writeJson(file, fallback);
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  const tempFile = `${file}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tempFile, file);
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function cleanText(value, limit) {
  return String(value || "").trim().slice(0, limit);
}

function signSession() {
  const payload = `${Date.now()}.${randomUUID()}`;
  return `${payload}.${hmac(payload)}`;
}

function isAuthenticated(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)juze_session=([^;]+)/);
  if (!match) return false;

  const value = decodeURIComponent(match[1]);
  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const payload = `${parts[0]}.${parts[1]}`;
  const issuedAt = Number(parts[0]);
  const signature = parts[2];
  const eightHours = 8 * 60 * 60 * 1000;

  return Date.now() - issuedAt < eightHours && constantTimeEqual(signature, hmac(payload));
}

function hmac(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
