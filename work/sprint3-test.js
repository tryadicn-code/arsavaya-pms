const { chromium } = require("playwright");
const path = require("path");

const outputUrl = `file:///${path.resolve("outputs/arsavaya-pms-v1.html").replace(/\\/g, "/")}`;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function result(name, pass, evidence) {
  return { name, pass, evidence };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath,
    args: ["--allow-file-access-from-files"]
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", error => consoleErrors.push(`pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(`console.error: ${message.text()}`);
  });

  await page.goto(outputUrl);
  await page.waitForTimeout(250);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(250);

  const initial = await page.evaluate(() => ({
    keys: Object.keys(localStorage).sort(),
    blocks: JSON.parse(localStorage.getItem("arsavaya-blocks") || "[]"),
    reservations: JSON.parse(localStorage.getItem("arsavaya-reservations") || "[]")
  }));

  await page.locator('[data-page="calendar"]').click();
  await page.locator('[data-action="create-calendar-block"]').click();
  const blockForm = page.locator('form[data-entity-form="calendar-block"]');
  await blockForm.locator('[name="propertyId"]').selectOption("property_005");
  await blockForm.locator('[name="unitId"]').selectOption("unit_005");
  await blockForm.locator('[name="type"]').selectOption("OWNER_STAY");
  await blockForm.locator('[name="reason"]').fill("Owner visit");
  await blockForm.locator('[name="startDate"]').fill("2026-09-14");
  await blockForm.locator('[name="endDate"]').fill("2026-09-16");
  await blockForm.locator('[name="notes"]').fill("Private use");
  await blockForm.locator('button[type="submit"]').click();
  await page.waitForTimeout(120);

  const createdBlock = await page.evaluate(() => {
    const blocks = JSON.parse(localStorage.getItem("arsavaya-blocks") || "[]");
    return blocks.find(block => block.reason === "Owner visit");
  });
  const calendarText = await page.locator("#pageContent").innerText();
  const persistedAfterCreate = await page.evaluate(() => localStorage.getItem("arsavaya-blocks") || "[]");

  await page.reload();
  await page.waitForTimeout(180);
  const persistedAfterRefresh = await page.evaluate(() => localStorage.getItem("arsavaya-blocks") || "[]");
  await page.locator('.nav-item[data-page="calendar"]').click();
  await page.waitForTimeout(100);

  const overlapPage = await context.newPage();
  await overlapPage.goto(outputUrl);
  await overlapPage.waitForTimeout(180);
  await overlapPage.locator('.nav-item[data-page="reservations"]').click();
  await overlapPage.locator('[data-open-modal]').click();
  const reservationForm = overlapPage.locator('form[data-entity-form="reservation"]');
  await reservationForm.locator('[name="primaryGuestId"]').selectOption("guest_001");
  await reservationForm.locator('[name="propertyId"]').selectOption("property_005");
  await reservationForm.locator('[name="unitId"]').selectOption("unit_005");
  await reservationForm.locator('[name="checkin"]').fill("2026-09-15");
  await reservationForm.locator('[name="checkout"]').fill("2026-09-16");
  await reservationForm.locator('[name="adults"]').fill("2");
  await reservationForm.locator('[name="accommodationRevenue"]').fill("1000000");
  await reservationForm.locator('button[type="submit"]').click();
  await overlapPage.waitForTimeout(120);
  const overlapToast = await overlapPage.locator("#toast").innerText();
  const reservationCountAfterOverlap = await overlapPage.evaluate(() =>
    JSON.parse(localStorage.getItem("arsavaya-reservations") || "[]").length
  );

  const reservationPage = await context.newPage();
  await reservationPage.goto(outputUrl);
  await reservationPage.waitForTimeout(180);
  await reservationPage.locator('.nav-item[data-page="reservations"]').click();
  await reservationPage.locator('[data-open-modal]').click();
  const availableForm = reservationPage.locator('form[data-entity-form="reservation"]');
  await availableForm.locator('[name="primaryGuestId"]').selectOption("guest_001");
  await availableForm.locator('[name="propertyId"]').selectOption("property_005");
  await availableForm.locator('[name="unitId"]').selectOption("unit_005");
  await availableForm.locator('[name="checkin"]').fill("2026-09-16");
  await availableForm.locator('[name="checkout"]').fill("2026-09-18");
  await availableForm.locator('[name="adults"]').fill("2");
  await availableForm.locator('[name="accommodationRevenue"]').fill("1000000");
  await availableForm.locator('button[type="submit"]').click();
  await reservationPage.waitForTimeout(120);
  const reservationCreatedAfterBlock = await reservationPage.evaluate(() => {
    const reservations = JSON.parse(localStorage.getItem("arsavaya-reservations") || "[]");
    return reservations.find(reservation => reservation.checkIn === "2026-09-16");
  });

  const blockBar = page.locator('.reservation-bar[data-block]').first();
  const blockBarCount = await page.locator('.reservation-bar[data-block]').count();

  console.log(JSON.stringify({
    initialKeys: initial.keys,
    results: [
      result("Initial blocks collection exists", initial.keys.includes("arsavaya-blocks"), `keys=${initial.keys.join(",")}`),
      result("Calendar block created", Boolean(createdBlock), JSON.stringify(createdBlock)),
      result("Block has relational IDs", Boolean(createdBlock?.propertyId === "property_005" && createdBlock?.unitId === "unit_005"), `propertyId=${createdBlock?.propertyId}, unitId=${createdBlock?.unitId}`),
      result("Calendar renders block event", blockBarCount > 0 && calendarText.includes("Owner stay"), `bars=${blockBarCount}`),
      result("Block persists after refresh", persistedAfterCreate === persistedAfterRefresh, `before=${persistedAfterCreate.length}, after=${persistedAfterRefresh.length}`),
      result("Overlapping reservation rejected", /conflict/i.test(overlapToast) && reservationCountAfterOverlap === initial.reservations.length, `toast=${overlapToast}, count=${reservationCountAfterOverlap}`),
      result("Reservation after block end accepted", Boolean(reservationCreatedAfterBlock?.checkIn === "2026-09-16"), JSON.stringify(reservationCreatedAfterBlock)),
      result("No browser console errors", consoleErrors.length === 0, consoleErrors)
    ]
  }, null, 2));

  await browser.close();
})();
