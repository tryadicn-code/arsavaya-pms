const { chromium } = require("playwright");
const path = require("path");

const outputUrl = `file:///${path.resolve("outputs/arsavaya-pms-v1.html").replace(/\\/g, "/")}`;
const expectedKeys = [
  "arsavaya-blocks",
  "arsavaya-guests",
  "arsavaya-management-agreements",
  "arsavaya-messages",
  "arsavaya-owners",
  "arsavaya-properties",
  "arsavaya-reservations",
  "arsavaya-settings",
  "arsavaya-tasks",
  "arsavaya-threads",
  "arsavaya-units",
  "arsavaya-users",
  "arsavaya-workspace"
];
const moneyFields = [
  "accommodationRevenue",
  "roomRevenue",
  "cleaningFee",
  "taxes",
  "extras",
  "discounts",
  "otaCommission",
  "paymentProcessingFee"
];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

async function readStore(page) {
  return page.evaluate(() => {
    const read = key => {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    };
    return {
      keys: Object.keys(localStorage).sort(),
      workspace: read("arsavaya-workspace"),
      users: read("arsavaya-users"),
      owners: read("arsavaya-owners"),
      agreements: read("arsavaya-management-agreements"),
      properties: read("arsavaya-properties"),
      units: read("arsavaya-units"),
      guests: read("arsavaya-guests"),
      reservations: read("arsavaya-reservations")
    };
  });
}

function integrity(data) {
  const propertyIds = new Set(data.properties.map(item => item.id));
  const unitIds = new Set(data.units.map(item => item.id));
  const guestIds = new Set(data.guests.map(item => item.id));
  const dates = data.reservations.flatMap(item => [item.checkIn, item.checkOut]);
  return {
    Workspace: Boolean(data.workspace?.id && data.workspace?.timezone === "Asia/Makassar"),
    Users: Array.isArray(data.users) && data.users.length > 0,
    Owners: Array.isArray(data.owners),
    Agreements: Array.isArray(data.agreements) && data.agreements.every(item =>
      data.owners.some(owner => owner.id === item.ownerId) &&
      data.properties.some(property => property.id === item.propertyId)
    ),
    Properties: Array.isArray(data.properties),
    Units: Array.isArray(data.units) && data.units.every(item => propertyIds.has(item.propertyId)),
    Guests: Array.isArray(data.guests),
    Reservations: Array.isArray(data.reservations) && data.reservations.every(item =>
      propertyIds.has(item.propertyId) &&
      unitIds.has(item.unitId) &&
      guestIds.has(item.primaryGuestId) &&
      data.units.find(unit => unit.id === item.unitId)?.propertyId === item.propertyId
    ),
    "LocalStorage persistence": expectedKeys.every(key => data.keys.includes(key)),
    "ID relationships": data.reservations.every(item =>
      propertyIds.has(item.propertyId) &&
      unitIds.has(item.unitId) &&
      guestIds.has(item.primaryGuestId) &&
      data.units.find(unit => unit.id === item.unitId)?.propertyId === item.propertyId
    ),
    "numeric money values": data.reservations.every(item =>
      moneyFields.every(field => typeof item[field] === "number" && Number.isFinite(item[field]))
    ),
    "ISO dates": dates.every(value => typeof value === "string" && isoDate.test(value)),
    "canonical fields": data.reservations.every(item =>
      typeof item.primaryGuestId === "string" &&
      typeof item.accommodationRevenue === "number"
    )
  };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", error => consoleErrors.push(`pageerror: ${error}`));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(`console.error: ${message.text()}`);
  });

  await page.goto(outputUrl);
  await page.waitForTimeout(350);
  const initial = await readStore(page);
  const dateDisplay = await page.locator("#topbarDate").textContent();
  const pageResults = [];
  for (const pageName of [
    "dashboard",
    "calendar",
    "reservations",
    "properties",
    "guests",
    "inbox",
    "tasks",
    "reports",
    "owners",
    "settings"
  ]) {
    await page.locator(`[data-page="${pageName}"]`).first().click();
    await page.waitForTimeout(45);
    pageResults.push({
      page: pageName,
      rendered: (await page.locator("#pageContent").innerText()).trim().length > 0
    });
  }

  await page.evaluate(() => localStorage.setItem("arsavaya-blocks", "[]"));
  await page.reload();
  await page.waitForTimeout(180);
  const emptyCollectionPreserved = await page.evaluate(() => localStorage.getItem("arsavaya-blocks") === "[]");
  const beforeRefresh = await readStore(page);
  await page.reload();
  await page.waitForTimeout(180);
  const afterRefresh = await readStore(page);
  const browserRefreshPersistence =
    JSON.stringify(beforeRefresh.properties) === JSON.stringify(afterRefresh.properties) &&
    JSON.stringify(beforeRefresh.units) === JSON.stringify(afterRefresh.units) &&
    JSON.stringify(beforeRefresh.guests) === JSON.stringify(afterRefresh.guests) &&
    JSON.stringify(beforeRefresh.reservations) === JSON.stringify(afterRefresh.reservations);

  console.log(JSON.stringify({
    integrity: integrity(initial),
    finalIntegrity: integrity(afterRefresh),
    dateDisplay,
    pageResults,
    emptyCollectionPreserved,
    browserRefreshPersistence,
    consoleErrors
  }, null, 2));
  await browser.close();
})();
