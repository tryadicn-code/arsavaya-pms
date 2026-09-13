const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`file:///${path.resolve("outputs/arsavaya-pms-v1.html").replace(/\\/g, "/")}`);
  await page.waitForTimeout(300);
  await page.locator('[data-page="owners"]').click();
  await page.locator('[data-action="add-owner"]').click();
  await page.locator('form[data-entity-form="owner"] input[name="name"]').fill("Temporary Audit Owner");
  await page.locator('form[data-entity-form="owner"] input[name="ownerCode"]').fill("TMP-001");
  await page.locator('form[data-entity-form="owner"] button[type="submit"]').click();
  await page.waitForTimeout(40);
  await page.locator('[data-page="properties"]').click();
  await page.locator('[data-action="add-property"]').click();
  await page.locator('form[data-entity-form="property"] input[name="name"]').fill("Temporary Audit Villa");
  await page.locator('form[data-entity-form="property"] input[name="code"]').fill("TMP-001");
  await page.locator('form[data-entity-form="property"] input[name="location"]').fill("Sanur, Bali");
  const ownerId = await page.locator('form[data-entity-form="property"] select[name="ownerId"] option').filter({ hasText: "Temporary Audit Owner" }).getAttribute("value");
  await page.locator('form[data-entity-form="property"] select[name="ownerId"]').selectOption(ownerId);
  await page.locator('form[data-entity-form="property"] button[type="submit"]').click();
  await page.waitForTimeout(40);
  await page.locator('[data-page="reservations"]').click();
  await page.locator('[data-open-modal]').click();
  await page.locator('form[data-entity-form="reservation"] input[name="guest"]').fill("Temporary Audit Guest");
  const unitId = await page.locator('form[data-entity-form="reservation"] select[name="unitId"] option').filter({ hasText: "Temporary Audit Villa" }).getAttribute("value");
  await page.locator('form[data-entity-form="reservation"] select[name="unitId"]').selectOption(unitId);
  await page.locator('form[data-entity-form="reservation"] input[name="checkin"]').fill("2027-01-10");
  await page.locator('form[data-entity-form="reservation"] input[name="checkout"]').fill("2027-01-12");
  await page.locator('form[data-entity-form="reservation"] input[name="accommodationRevenue"]').fill("2000000");
  await page.locator('form[data-entity-form="reservation"] button[type="submit"]').click();
  await page.waitForTimeout(100);
  const result = await page.evaluate(() => {
    const read = key => JSON.parse(localStorage.getItem(key));
    const properties = read("arsavaya-properties");
    const units = read("arsavaya-units");
    const guests = read("arsavaya-guests");
    const reservations = read("arsavaya-reservations");
    const reservation = reservations.find(item => item.checkIn === "2027-01-10");
    const unit = units.find(item => item.id === reservation?.unitId);
    return {
      created: Boolean(reservation),
      propertyId: Boolean(reservation?.propertyId && properties.some(item => item.id === reservation.propertyId)),
      unitId: Boolean(reservation?.unitId && unit),
      primaryGuestId: Boolean(reservation?.primaryGuestId && guests.some(item => item.id === reservation.primaryGuestId)),
      unitBelongsToProperty: Boolean(unit && unit.propertyId === reservation.propertyId),
      accommodationRevenueNumber: typeof reservation?.accommodationRevenue === "number" && reservation.accommodationRevenue === 2000000,
      legacyFieldsMirrored: reservation?.guestId === reservation?.primaryGuestId && reservation?.roomRevenue === reservation?.accommodationRevenue,
      datesIso: /^\d{4}-\d{2}-\d{2}$/.test(reservation?.checkIn || "") && /^\d{4}-\d{2}-\d{2}$/.test(reservation?.checkOut || "")
    };
  });
  console.log(JSON.stringify({ result, errors }, null, 2));
  await browser.close();
})();
