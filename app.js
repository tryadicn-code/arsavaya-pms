const seedWorkspace = {
  id: "workspace_arsavaya_bali",
  name: "Arsavaya Bali",
  legalName: "PT Arsavaya Hospitality",
  timezone: "Asia/Makassar",
  currency: "IDR",
  language: "en",
  logo: "A",
  email: "hello@arsavaya.com",
  phone: "+62 361 000 000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z"
};

const seedUsers = [
  { id: "user_nyoman", workspaceId: seedWorkspace.id, name: "Nyoman S.", email: "nyoman@arsavaya.com", phone: "", role: "MANAGER", status: "ACTIVE", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-09-13T00:00:00.000Z" }
];

const seedOwners = [
  { id: "owner_001", workspaceId: seedWorkspace.id, ownerCode: "OWN-001", name: "Made Wirawan", email: "made.wirawan@email.com", phone: "+62 812 3456 7890", address: "Denpasar, Bali", bankDetails: "", taxInfo: "", notes: "Primary owner for the first portfolio group.", status: "ACTIVE", createdAt: "2026-01-04T00:00:00.000Z", updatedAt: "2026-09-13T00:00:00.000Z" },
  { id: "owner_002", workspaceId: seedWorkspace.id, ownerCode: "OWN-002", name: "Ayu Prameswari", email: "ayu.prameswari@email.com", phone: "+62 813 2222 1111", address: "Jakarta, Indonesia", bankDetails: "", taxInfo: "", notes: "Villa Tirtha Complex owner.", status: "ACTIVE", createdAt: "2026-01-05T00:00:00.000Z", updatedAt: "2026-09-13T00:00:00.000Z" }
];

const seedManagementAgreements = [
  { id: "agreement_001", workspaceId: seedWorkspace.id, ownerId: "owner_001", propertyId: "property_001", packageName: "Full management", startDate: "2026-01-01", endDate: null, managementFeeType: "PERCENTAGE", managementFeeValue: 20, minimumFee: 0, setupFee: 0, status: "ACTIVE" },
  { id: "agreement_002", workspaceId: seedWorkspace.id, ownerId: "owner_002", propertyId: "property_006", packageName: "Complex management", startDate: "2026-01-01", endDate: null, managementFeeType: "PERCENTAGE", managementFeeValue: 18, minimumFee: 0, setupFee: 0, status: "ACTIVE" }
];

const seedProperties = [
  { id: "property_001", workspaceId: seedWorkspace.id, ownerId: "owner_001", code: "ARSA-001", name: "Villa Samara", address: "Sanur, Bali", location: "Sanur, Bali", propertyType: "STANDALONE", type: "standalone", timezone: "Asia/Makassar", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85", next: "Check-out today" },
  { id: "property_002", workspaceId: seedWorkspace.id, ownerId: "owner_001", code: "ARSA-002", name: "Villa Nirmala", address: "Canggu, Bali", location: "Canggu, Bali", propertyType: "STANDALONE", type: "standalone", timezone: "Asia/Makassar", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85", next: "Check-in in 2 days" },
  { id: "property_003", workspaceId: seedWorkspace.id, ownerId: "owner_001", code: "ARSA-003", name: "Villa Aura", address: "Ubud, Bali", location: "Ubud, Bali", propertyType: "STANDALONE", type: "standalone", timezone: "Asia/Makassar", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85", next: "Pool service · Today" },
  { id: "property_004", workspaceId: seedWorkspace.id, ownerId: "owner_001", code: "ARSA-004", name: "Villa Savara", address: "Seminyak, Bali", location: "Seminyak, Bali", propertyType: "STANDALONE", type: "standalone", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=85", next: "Check-in today" },
  { id: "property_005", workspaceId: seedWorkspace.id, ownerId: "owner_001", code: "ARSA-005", name: "Villa Loka", address: "Uluwatu, Bali", location: "Uluwatu, Bali", propertyType: "STANDALONE", type: "standalone", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85", next: "Check-in tomorrow" },
  { id: "property_006", workspaceId: seedWorkspace.id, ownerId: "owner_002", code: "ARSA-006", name: "Villa Tirtha Complex", address: "Jimbaran, Bali", location: "Jimbaran, Bali", propertyType: "COMPLEX", type: "complex", timezone: "Asia/Makassar", status: "ACTIVE", latitude: null, longitude: null, notes: "", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85", next: "Unit operations · Today" }
];

function propertyImageData(label, color = "#8fb9a2") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 540"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7efe2"/><stop offset="1" stop-color="#d9eadf"/></linearGradient></defs><rect width="900" height="540" fill="url(#sky)"/><rect x="0" y="340" width="900" height="200" fill="#d8c09a"/><rect x="82" y="210" width="520" height="190" rx="10" fill="#fff8ed"/><path d="M56 225h575L498 126H178z" fill="${color}"/><rect x="138" y="268" width="104" height="132" fill="#6c8f87"/><rect x="292" y="264" width="228" height="92" rx="4" fill="#a8c9c2"/><rect x="645" y="285" width="170" height="86" rx="43" fill="#6ea083"/><rect x="610" y="365" width="240" height="68" rx="34" fill="#97cfc4"/><text x="96" y="477" fill="#28483f" font-family="Arial, sans-serif" font-size="34" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
const localPropertyImages = {
  property_001: propertyImageData("Villa Samara", "#6f9f88"),
  property_002: propertyImageData("Villa Nirmala", "#a8835d"),
  property_003: propertyImageData("Villa Aura", "#7289a8"),
  property_004: propertyImageData("Villa Savara", "#bd786a"),
  property_005: propertyImageData("Villa Loka", "#7d9b66"),
  property_006: propertyImageData("Tirtha Complex", "#8e7bb1")
};

const seedUnits = [
  { id: "unit_001", workspaceId: seedWorkspace.id, propertyId: "property_001", code: "ENTIRE-VILLA", name: "Entire Villa", inventoryType: "ENTIRE_VILLA", bedrooms: 3, bathrooms: 2, maxGuests: 6, baseRate: 2400000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_002", workspaceId: seedWorkspace.id, propertyId: "property_002", code: "ENTIRE-VILLA", name: "Entire Villa", inventoryType: "ENTIRE_VILLA", bedrooms: 2, bathrooms: 2, maxGuests: 4, baseRate: 1900000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_003", workspaceId: seedWorkspace.id, propertyId: "property_003", code: "ENTIRE-VILLA", name: "Entire Villa", inventoryType: "ENTIRE_VILLA", bedrooms: 4, bathrooms: 3, maxGuests: 8, baseRate: 3000000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "CLEANING" },
  { id: "unit_004", workspaceId: seedWorkspace.id, propertyId: "property_004", code: "ENTIRE-VILLA", name: "Entire Villa", inventoryType: "ENTIRE_VILLA", bedrooms: 3, bathrooms: 2, maxGuests: 6, baseRate: 2500000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_005", workspaceId: seedWorkspace.id, propertyId: "property_005", code: "ENTIRE-VILLA", name: "Entire Villa", inventoryType: "ENTIRE_VILLA", bedrooms: 2, bathrooms: 2, maxGuests: 4, baseRate: 2100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_01", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-01", name: "Unit 01", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_02", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-02", name: "Unit 02", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_03", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-03", name: "Unit 03", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_04", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-04", name: "Unit 04", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_05", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-05", name: "Unit 05", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" },
  { id: "unit_006_06", workspaceId: seedWorkspace.id, propertyId: "property_006", code: "UNIT-06", name: "Unit 06", inventoryType: "PRIVATE_UNIT", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 1100000, checkInTime: "15:00", checkOutTime: "11:00", status: "ACTIVE", housekeepingStatus: "READY" }
];

const seedReservations = [
  { id: "reservation_124", reference: "ARS-2026-000124", workspaceId: seedWorkspace.id, propertyId: "property_001", unitId: "unit_001", primaryGuestId: "guest_001", guestId: "guest_001", checkIn: "2026-09-20", checkOut: "2026-09-23", adults: 2, children: 1, infants: 0, source: "airbnb", channelId: "channel_airbnb", externalReservationId: "HMABC123", status: "CONFIRMED", paymentStatus: "PAID", accommodationRevenue: 4500000, roomRevenue: 4500000, cleaningFee: 300000, taxes: 0, extras: 0, discounts: 0, otaCommission: 675000, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_123", reference: "ARS-2026-000123", workspaceId: seedWorkspace.id, propertyId: "property_003", unitId: "unit_003", primaryGuestId: "guest_002", guestId: "guest_002", checkIn: "2026-09-18", checkOut: "2026-09-21", adults: 2, children: 0, infants: 0, source: "booking_com", channelId: "channel_booking_com", externalReservationId: "BK-88421", status: "CHECKED_IN", paymentStatus: "PAID", accommodationRevenue: 6750000, roomRevenue: 6750000, cleaningFee: 350000, taxes: 0, extras: 0, discounts: 0, otaCommission: 1012500, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_122", reference: "ARS-2026-000122", workspaceId: seedWorkspace.id, propertyId: "property_004", unitId: "unit_004", primaryGuestId: "guest_003", guestId: "guest_003", checkIn: "2026-09-16", checkOut: "2026-09-18", adults: 2, children: 0, infants: 0, source: "airbnb", channelId: "channel_airbnb", externalReservationId: "HMXYZ789", status: "CONFIRMED", paymentStatus: "PAID", accommodationRevenue: 3200000, roomRevenue: 3200000, cleaningFee: 250000, taxes: 0, extras: 0, discounts: 0, otaCommission: 480000, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_121", reference: "ARS-2026-000121", workspaceId: seedWorkspace.id, propertyId: "property_002", unitId: "unit_002", primaryGuestId: "guest_004", guestId: "guest_004", checkIn: "2026-09-13", checkOut: "2026-09-16", adults: 2, children: 0, infants: 0, source: "direct", channelId: "channel_direct", externalReservationId: null, status: "PENDING", paymentStatus: "UNPAID", accommodationRevenue: 5100000, roomRevenue: 5100000, cleaningFee: 300000, taxes: 0, extras: 0, discounts: 0, otaCommission: 0, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_120", reference: "ARS-2026-000120", workspaceId: seedWorkspace.id, propertyId: "property_003", unitId: "unit_003", primaryGuestId: "guest_005", guestId: "guest_005", checkIn: "2026-09-25", checkOut: "2026-09-28", adults: 2, children: 0, infants: 0, source: "direct", channelId: "channel_direct", externalReservationId: null, status: "CONFIRMED", paymentStatus: "PAID", accommodationRevenue: 4800000, roomRevenue: 4800000, cleaningFee: 300000, taxes: 0, extras: 0, discounts: 0, otaCommission: 0, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_119", reference: "ARS-2026-000119", workspaceId: seedWorkspace.id, propertyId: "property_001", unitId: "unit_001", primaryGuestId: "guest_006", guestId: "guest_006", checkIn: "2026-09-17", checkOut: "2026-09-20", adults: 2, children: 0, infants: 0, source: "booking_com", channelId: "channel_booking_com", externalReservationId: "BK-88414", status: "CONFIRMED", paymentStatus: "PAID", accommodationRevenue: 5400000, roomRevenue: 5400000, cleaningFee: 300000, taxes: 0, extras: 0, discounts: 0, otaCommission: 810000, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" },
  { id: "reservation_118", reference: "ARS-2026-000118", workspaceId: seedWorkspace.id, propertyId: "property_004", unitId: "unit_004", primaryGuestId: "guest_007", guestId: "guest_007", checkIn: "2026-09-15", checkOut: "2026-09-19", adults: 2, children: 0, infants: 0, source: "airbnb", channelId: "channel_airbnb", externalReservationId: "HMZZ1122", status: "CANCELLED", paymentStatus: "REFUNDED", accommodationRevenue: 7600000, roomRevenue: 7600000, cleaningFee: 350000, taxes: 0, extras: 0, discounts: 0, otaCommission: 1140000, paymentProcessingFee: 0, currency: "IDR", internalNotes: "", guestNotes: "" }
];

const seedGuests = [
  { id: "guest_001", workspaceId: seedWorkspace.id, firstName: "John", lastName: "Smith", email: "john.smith@email.com", phone: "", country: "Australia", language: "en", dateOfBirth: null, vipStatus: false, notes: "", initials: "JS", avatar: "avatar-blue", tier: "Returning guest" },
  { id: "guest_002", workspaceId: seedWorkspace.id, firstName: "Emma", lastName: "Carter", email: "emma.carter@email.com", phone: "", country: "United Kingdom", language: "en", dateOfBirth: null, vipStatus: false, notes: "", initials: "EC", avatar: "avatar-coral", tier: "" },
  { id: "guest_003", workspaceId: seedWorkspace.id, firstName: "Daniel", lastName: "Kim", email: "daniel.kim@email.com", phone: "", country: "South Korea", language: "en", dateOfBirth: null, vipStatus: true, notes: "", initials: "DK", avatar: "avatar-sage", tier: "VIP" },
  { id: "guest_004", workspaceId: seedWorkspace.id, firstName: "Sophie", lastName: "Martin", email: "sophie.martin@email.com", phone: "", country: "France", language: "en", dateOfBirth: null, vipStatus: false, notes: "", initials: "SM", avatar: "avatar-amber", tier: "" },
  { id: "guest_005", workspaceId: seedWorkspace.id, firstName: "Michael", lastName: "Tan", email: "michael.tan@email.com", phone: "", country: "Singapore", language: "en", dateOfBirth: null, vipStatus: true, notes: "", initials: "MT", avatar: "avatar-blue", tier: "VIP" },
  { id: "guest_006", workspaceId: seedWorkspace.id, firstName: "Sarah", lastName: "Lee", email: "sarah.lee@email.com", phone: "", country: "United States", language: "en", dateOfBirth: null, vipStatus: false, notes: "", initials: "SL", avatar: "avatar-lilac", tier: "" },
  { id: "guest_007", workspaceId: seedWorkspace.id, firstName: "Olivia", lastName: "Brown", email: "olivia.brown@email.com", phone: "", country: "Germany", language: "en", dateOfBirth: null, vipStatus: false, notes: "", initials: "OB", avatar: "avatar-coral", tier: "" }
];

function cloneSeed(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadCollection(key, seedValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(seedValue) && Array.isArray(parsed)) return parsed;
      if (!Array.isArray(seedValue) && parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fall back to the in-memory demo dataset when storage is unavailable.
  }
  const freshValue = cloneSeed(seedValue);
  try {
    localStorage.setItem(key, JSON.stringify(freshValue));
  } catch {
    // Continue with the in-memory seed.
  }
  return freshValue;
}

function saveCollection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The prototype remains usable without browser storage.
  }
}

const workspace = loadCollection("arsavaya-workspace", seedWorkspace);
const users = loadCollection("arsavaya-users", seedUsers);
const owners = loadCollection("arsavaya-owners", seedOwners);
const managementAgreements = loadCollection("arsavaya-management-agreements", seedManagementAgreements);
const properties = loadCollection("arsavaya-properties", seedProperties);
const units = loadCollection("arsavaya-units", seedUnits);
let reservations = loadCollection("arsavaya-reservations", seedReservations);
let guests = loadCollection("arsavaya-guests", seedGuests);
const seedThreads = [
  { id: "thread_001", workspaceId: seedWorkspace.id, reservationId: "reservation_124", guestId: "guest_001", name: "John Smith", initials: "JS", avatar: "avatar-blue", channel: "Airbnb · ARSA-001", preview: "Can we arrange airport pickup for tomorrow?", time: "9:42", unread: true },
  { id: "thread_002", workspaceId: seedWorkspace.id, reservationId: "reservation_123", guestId: "guest_002", name: "Emma Carter", initials: "EC", avatar: "avatar-coral", channel: "Booking.com · ARSA-003", preview: "Thank you, everything looks beautiful.", time: "8:18", unread: true },
  { id: "thread_003", workspaceId: seedWorkspace.id, reservationId: "reservation_122", guestId: "guest_003", name: "Daniel Kim", initials: "DK", avatar: "avatar-sage", channel: "Direct · ARSA-004", preview: "Is early check-in possible at 1pm?", time: "Yesterday", unread: false },
  { id: "thread_004", workspaceId: seedWorkspace.id, reservationId: "reservation_121", guestId: "guest_004", name: "Sophie Martin", initials: "SM", avatar: "avatar-amber", channel: "Direct · ARSA-002", preview: "We have updated our arrival time to 4pm.", time: "Yesterday", unread: false },
  { id: "thread_005", workspaceId: seedWorkspace.id, reservationId: "reservation_119", guestId: "guest_006", name: "Sarah Lee", initials: "SL", avatar: "avatar-lilac", channel: "Booking.com · ARSA-001", preview: "Do you have a recommendation for a private chef?", time: "12 Sep", unread: false }
];
const seedTasks = [
  { id: "task-1", workspaceId: seedWorkspace.id, task: "Guest check-out", unitId: "unit_001", category: "Housekeeping", assignee: "Team A", due: "2026-09-13T10:00:00", status: "OPEN", statusClass: "checked", priority: "HIGH", done: false },
  { id: "task-2", workspaceId: seedWorkspace.id, task: "Cleaning", unitId: "unit_001", category: "Housekeeping", assignee: "Team A", due: "2026-09-13T11:00:00", status: "IN_PROGRESS", statusClass: "checked", priority: "HIGH", done: false },
  { id: "task-3", workspaceId: seedWorkspace.id, task: "Room inspection", unitId: "unit_004", category: "Inspection", assignee: "Supervisor", due: "2026-09-13T14:00:00", status: "OPEN", statusClass: "checked", priority: "MEDIUM", done: false },
  { id: "task-4", workspaceId: seedWorkspace.id, task: "Guest check-in", unitId: "unit_001", category: "Guest request", assignee: "Team A", due: "2026-09-13T15:00:00", status: "OPEN", statusClass: "checked", priority: "MEDIUM", done: false },
  { id: "task-5", workspaceId: seedWorkspace.id, task: "Pool cleaning", unitId: "unit_002", category: "Housekeeping", assignee: "Team B", due: "2026-09-13T11:00:00", status: "COMPLETED", statusClass: "confirmed", priority: "LOW", done: true },
  { id: "task-6", workspaceId: seedWorkspace.id, task: "AC not cooling", unitId: "unit_003", category: "Maintenance", assignee: "Technician", due: "2026-09-13T09:00:00", status: "IN_PROGRESS", statusClass: "checked", priority: "HIGH", done: false },
  { id: "task-7", workspaceId: seedWorkspace.id, task: "Garden maintenance", unitId: "unit_006_01", category: "Maintenance", assignee: "Ketut", due: "2026-09-14T09:00:00", status: "SCHEDULED", statusClass: "confirmed", priority: "LOW", done: false }
];
const seedMessages = [
  { id: "message_001", workspaceId: seedWorkspace.id, threadId: "thread_004", direction: "INBOUND", body: "Hi team, we have had the most wonderful morning at Villa Sembuwuk. The view is even better than the photos.", sentAt: "2026-09-13T09:12:00", senderId: "guest_004", deliveryStatus: "DELIVERED" },
  { id: "message_002", workspaceId: seedWorkspace.id, threadId: "thread_004", direction: "INBOUND", body: "Could we arrange a floating breakfast for tomorrow, around 8:30am?", sentAt: "2026-09-13T09:13:00", senderId: "guest_004", deliveryStatus: "DELIVERED" },
  { id: "message_003", workspaceId: seedWorkspace.id, threadId: "thread_004", direction: "OUTBOUND", body: "Good morning Sophie, so happy to hear that. I have noted your floating breakfast request for 8:30am tomorrow. Our team will prepare everything by the pool.", sentAt: "2026-09-13T09:24:00", senderId: "user_nyoman", deliveryStatus: "SENT" },
  { id: "message_004", workspaceId: seedWorkspace.id, threadId: "thread_004", direction: "INBOUND", body: "That sounds perfect, thank you so much!", sentAt: "2026-09-13T09:42:00", senderId: "guest_004", deliveryStatus: "DELIVERED" }
];
const threads = loadCollection("arsavaya-threads", seedThreads);
let tasks = loadCollection("arsavaya-tasks", seedTasks);
const blocks = loadCollection("arsavaya-blocks", []);
const settings = loadCollection("arsavaya-settings", { workspaceId: seedWorkspace.id, language: "en", dateFormat: "dd MMM yyyy", defaultCheckInTime: "15:00", defaultCheckOutTime: "11:00" });
const messages = loadCollection("arsavaya-messages", seedMessages);
const calendarBlockTypes = new Set(["OWNER_STAY", "MAINTENANCE", "PRIVATE_USE", "MANUAL_BLOCK", "OUT_OF_ORDER"]);
const calendarBlockTypeLabels = {
  OWNER_STAY: "Owner stay",
  MAINTENANCE: "Maintenance",
  PRIVATE_USE: "Private use",
  MANUAL_BLOCK: "Manual block",
  OUT_OF_ORDER: "Out of order"
};

const pageMeta = {
  dashboard: { label: "Dashboard", eyebrow: "" },
  calendar: { label: "Calendar", eyebrow: "Portfolio availability" },
  reservations: { label: "Reservations", eyebrow: "Booking management" },
  properties: { label: "Properties", eyebrow: "Your Bali portfolio" },
  guests: { label: "Guests", eyebrow: "Guest relationship management" },
  inbox: { label: "Inbox", eyebrow: "Guest communications" },
  tasks: { label: "Tasks", eyebrow: "Operations checklist" },
  reports: { label: "Reports", eyebrow: "Portfolio performance" },
  owners: { label: "Owners", eyebrow: "Owner relationships" },
  settings: { label: "Settings", eyebrow: "Workspace configuration" }
};

const languageCopy = {
  en: {
    nav: { dashboard: "Dashboard", calendar: "Calendar", reservations: "Reservations", properties: "Properties", guests: "Guests", inbox: "Inbox", tasks: "Tasks", reports: "Reports", owners: "Owners", settings: "Settings" },
    workspace: "Workspace",
    operations: "Operations",
    settingsEyebrow: "Workspace configuration",
    settingsTitle: "Workspace settings",
    settingsCopy: "Configure your team, communication channels, templates, and language preferences.",
    languageTitle: "Language",
    languageCopy: "Choose the language used across your Arsavaya PMS workspace.",
    currentLanguage: "Current language",
    english: "English",
    indonesian: "Bahasa Indonesia",
    save: "Save changes",
    saved: "Language preference saved",
    englishApplied: "English language applied",
    indonesianApplied: "Bahasa Indonesia diterapkan"
  },
  id: {
    nav: { dashboard: "Dasbor", calendar: "Kalender", reservations: "Reservasi", properties: "Properti", guests: "Tamu", inbox: "Kotak Masuk", tasks: "Tugas", reports: "Laporan", owners: "Pemilik", settings: "Pengaturan" },
    workspace: "Ruang Kerja",
    operations: "Operasional",
    settingsEyebrow: "Konfigurasi ruang kerja",
    settingsTitle: "Pengaturan ruang kerja",
    settingsCopy: "Atur tim, channel komunikasi, template, dan preferensi bahasa PMS Arsavaya.",
    languageTitle: "Bahasa",
    languageCopy: "Pilih bahasa yang digunakan di seluruh workspace Arsavaya PMS.",
    currentLanguage: "Bahasa aktif",
    english: "English",
    indonesian: "Bahasa Indonesia",
    save: "Simpan perubahan",
    saved: "Preferensi bahasa tersimpan",
    englishApplied: "English diterapkan",
    indonesianApplied: "Bahasa Indonesia diterapkan"
  }
};

let activePage = "dashboard";
let activeThread = 0;
let reservationFilter = "all";
let reservationSource = "all";
let reservationSearch = "";
let propertyFilter = "all";
let propertySort = "occupancy";
let guestFilter = "all";
let guestSearch = "";
let inboxFilter = "all";
let calendarView = "Week";
let calendarFocusIso = "";
let taskFilter = "all";
let language = (() => {
  try {
    return localStorage.getItem("arsavaya-language") === "id" ? "id" : "en";
  } catch {
    return "en";
  }
})();
let pendingLanguage = language;

const pageContent = document.getElementById("pageContent");
const breadcrumbPage = document.getElementById("breadcrumbPage");
const modalBackdrop = document.getElementById("modalBackdrop");
const toast = document.getElementById("toast");
const topbarDate = document.getElementById("topbarDate");

const drawerBackdrop = document.createElement("div");
drawerBackdrop.className = "drawer-backdrop";
drawerBackdrop.hidden = true;
drawerBackdrop.innerHTML = `
  <aside class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
    <div class="drawer-header">
      <div><span class="eyebrow" id="drawerEyebrow">Details</span><h2 id="drawerTitle">Record</h2></div>
      <button class="icon-button" id="closeDrawer" aria-label="Close details">${icon("x")}</button>
    </div>
    <div class="drawer-body" id="drawerBody"></div>
    <div class="drawer-footer" id="drawerFooter"></div>
  </aside>`;
document.body.appendChild(drawerBackdrop);

function icon(name) { return `<i data-lucide="${name}"></i>`; }
function avatar(initials, avatarClass = "avatar-sage") { return `<div class="avatar ${avatarClass}">${initials}</div>`; }
const currencyFormatter = new Intl.NumberFormat("id-ID");
const applicationTimeZone = workspace.timezone || "Asia/Makassar";
const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, day: "numeric", month: "short", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, day: "numeric", month: "short" });
const applicationDateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const applicationMonthFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, month: "long", year: "numeric" });
const sourceLabels = { airbnb: "Airbnb", booking_com: "Booking.com", agoda: "Agoda", traveloka: "Traveloka", direct: "Direct", other: "Other" };
const statusLabels = {
  INQUIRY: "Inquiry",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show"
};
const statusClasses = { INQUIRY: "pending", PENDING: "pending", CONFIRMED: "confirmed", CHECKED_IN: "checked", CHECKED_OUT: "checked", CANCELLED: "cancelled", NO_SHOW: "cancelled" };
const paymentStatusValues = new Set(["UNPAID", "PARTIAL", "PAID", "REFUNDED"]);
const activeReservationStatuses = new Set(["INQUIRY", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"]);
const reservationReferenceYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: applicationTimeZone, year: "numeric" }).format(new Date()));
function normalizeStatus(value) { return String(value || "").trim().toUpperCase(); }
function normalizePaymentStatus(value) {
  const status = normalizeStatus(value);
  return paymentStatusValues.has(status) ? status : "UNPAID";
}
function isActiveReservation(reservation) { return activeReservationStatuses.has(normalizeStatus(reservation.status)); }
function isSellableUnit(unit) { return normalizeStatus(unit.status) === "ACTIVE"; }
function guestDisplayName(guest) {
  if (!guest) return "Unknown guest";
  return [guest.firstName, guest.lastName].filter(Boolean).join(" ") || guest.name || "Unknown guest";
}
function createId(prefix) {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function normalizeLoadedData() {
  properties.forEach(property => {
    property.workspaceId ||= workspace.id;
    property.ownerId ||= owners[0]?.id || null;
    property.address ||= property.location || "";
    property.location ||= property.address || "";
    property.propertyType = property.propertyType || (property.type === "complex" ? "COMPLEX" : "STANDALONE");
    property.status = ["ACTIVE", "INACTIVE", "ONBOARDING", "SUSPENDED"].includes(normalizeStatus(property.status)) ? normalizeStatus(property.status) : "ACTIVE";
    if (!property.image || String(property.image).startsWith("http")) property.image = localPropertyImages[property.id] || propertyImageData(property.name || property.code || "Arsavaya Villa");
  });
  units.forEach(unit => {
    unit.workspaceId ||= workspace.id;
    unit.inventoryType = normalizeStatus(unit.inventoryType || "ENTIRE_VILLA");
    unit.status = ["ACTIVE", "INACTIVE", "OUT_OF_ORDER"].includes(normalizeStatus(unit.status)) ? normalizeStatus(unit.status) : "ACTIVE";
    unit.bathrooms = Number(unit.bathrooms || 1);
    unit.maxGuests = Number(unit.maxGuests || 2);
    unit.baseRate = Number(unit.baseRate || 0);
    unit.housekeepingStatus ||= "READY";
  });
  guests.forEach(guest => {
    guest.workspaceId ||= workspace.id;
    if (!guest.firstName && guest.name) {
      const parts = String(guest.name).trim().split(/\s+/);
      guest.firstName = parts.shift() || "";
      guest.lastName = parts.join(" ");
    }
    guest.firstName ||= "";
    guest.lastName ||= "";
    guest.phone ||= "";
    guest.language ||= "en";
    guest.vipStatus = Boolean(guest.vipStatus || guest.tier === "VIP");
    guest.initials ||= guestDisplayName(guest).split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  });
  reservations.forEach(reservation => {
    reservation.workspaceId ||= workspace.id;
    // primaryGuestId and accommodationRevenue are canonical. Legacy fields remain
    // mirrored temporarily so older stored records can migrate without breaking.
    reservation.primaryGuestId ||= reservation.guestId;
    if (!getGuestById(reservation.primaryGuestId) && getGuestById(reservation.guestId)) reservation.primaryGuestId = reservation.guestId;
    reservation.guestId = reservation.primaryGuestId;
    reservation.propertyId ||= units.find(unit => unit.id === reservation.unitId)?.propertyId || null;
    if (!reservation.reference) {
      const legacyNumber = String(reservation.id || "").match(/ARS-(\d+)/)?.[1];
      reservation.reference = legacyNumber ? `ARS-${reservationReferenceYear}-${legacyNumber.padStart(6, "0")}` : `ARS-${reservationReferenceYear}-000000`;
    }
    if (String(reservation.id || "").startsWith("ARS-")) reservation.id = `reservation_${String(reservation.reference).split("-").pop()}`;
    reservation.status = normalizeStatus(reservation.status) || "PENDING";
    const paymentStatus = normalizeStatus(reservation.paymentStatus);
    reservation.paymentStatus = ({ PENDING: "UNPAID", PAID: "PAID", REFUNDED: "REFUNDED", PARTIAL: "PARTIAL" })[paymentStatus] || normalizePaymentStatus(paymentStatus);
    reservation.accommodationRevenue = moneyValue(reservation.accommodationRevenue ?? reservation.roomRevenue ?? 0);
    reservation.roomRevenue = reservation.accommodationRevenue;
    reservation.cleaningFee = moneyValue(reservation.cleaningFee);
    reservation.taxes = moneyValue(reservation.taxes);
    reservation.extras = moneyValue(reservation.extras);
    reservation.discounts = moneyValue(reservation.discounts);
    reservation.otaCommission = moneyValue(reservation.otaCommission);
    reservation.paymentProcessingFee = moneyValue(reservation.paymentProcessingFee);
    reservation.currency ||= workspace.currency;
    reservation.internalNotes ||= "";
    reservation.guestNotes ||= "";
    reservation.estimatedArrivalTime ||= "";
  });
  // Keep only relationally valid reservations in the working set. Invalid legacy
  // rows are retained separately for inspection instead of being silently lost.
  const invalidReservations = reservations.filter(reservation => {
    const property = properties.find(item => item.id === reservation.propertyId);
    const unit = units.find(item => item.id === reservation.unitId);
    const guest = guests.find(item => item.id === reservation.primaryGuestId);
    return !property || !unit || !guest || unit.propertyId !== property.id;
  });
  if (invalidReservations.length) saveCollection("arsavaya-invalid-reservations", invalidReservations);
  reservations = reservations.filter(reservation => !invalidReservations.includes(reservation));
  blocks.forEach(block => {
    block.workspaceId ||= workspace.id;
    block.propertyId ||= units.find(unit => unit.id === block.unitId)?.propertyId || null;
    block.type = calendarBlockTypes.has(normalizeStatus(block.type)) ? normalizeStatus(block.type) : "MANUAL_BLOCK";
    block.startDate ||= "";
    block.endDate ||= "";
    block.reason ||= "";
    block.notes ||= "";
    block.createdBy ||= users[0]?.id || null;
    block.createdAt ||= new Date().toISOString();
  });
  const invalidBlocks = blocks.filter(block => {
    const property = properties.find(item => item.id === block.propertyId);
    const unit = units.find(item => item.id === block.unitId);
    return !property || !unit || unit.propertyId !== property.id || !isIsoDate(block.startDate) || !isIsoDate(block.endDate) || block.endDate <= block.startDate;
  });
  if (invalidBlocks.length) saveCollection("arsavaya-invalid-blocks", invalidBlocks);
  blocks.splice(0, blocks.length, ...blocks.filter(block => !invalidBlocks.includes(block)));
  tasks.forEach(task => {
    task.workspaceId ||= workspace.id;
    task.status = normalizeStatus(task.status) || (task.done ? "COMPLETED" : "OPEN");
    task.priority = normalizeStatus(task.priority) || "MEDIUM";
  });
  saveCollection("arsavaya-properties", properties);
  saveCollection("arsavaya-units", units);
  saveCollection("arsavaya-guests", guests);
  saveCollection("arsavaya-reservations", reservations);
  saveCollection("arsavaya-blocks", blocks);
  saveCollection("arsavaya-tasks", tasks);
}
normalizeLoadedData();
function getPropertyById(id) { return properties.find(property => property.id === id); }
function getUnitById(id) { return units.find(unit => unit.id === id); }
function getUnitsByPropertyId(propertyId) { return units.filter(unit => unit.propertyId === propertyId && isSellableUnit(unit)); }
function getReservationUnit(reservation) { return getUnitById(reservation.unitId); }
function getReservationProperty(reservation) {
  const unit = getReservationUnit(reservation);
  return getPropertyById(unit?.propertyId || reservation.propertyId);
}
function reservationUnitId(reservation) {
  return getReservationUnit(reservation)?.id || reservation.unitId;
}
function getGuestById(id) { return guests.find(guest => guest.id === id); }
function parseDate(value) { return new Date(`${value}T00:00:00`); }
function applicationDateParts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: applicationTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}
function applicationDateLabel(date = new Date()) {
  return applicationDateFormatter.format(date);
}
function applicationMonthLabel(date = new Date()) {
  return applicationMonthFormatter.format(date);
}
function relativeDateLabel(isoDate) {
  const days = calculateNights(todayIso(), isoDate);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
function reservationIntegrityErrors(reservation) {
  const property = getPropertyById(reservation.propertyId);
  const unit = getUnitById(reservation.unitId);
  const guest = getGuestById(reservation.primaryGuestId);
  const errors = [];
  if (!property) errors.push("propertyId");
  if (!unit) errors.push("unitId");
  if (!guest) errors.push("primaryGuestId");
  if (unit && property && unit.propertyId !== property.id) errors.push("unit.propertyId");
  return errors;
}
function isReservationIntegrityValid(reservation) {
  return reservationIntegrityErrors(reservation).length === 0;
}
function reservationIntegritySummary() {
  return reservations.flatMap(reservation => {
    const errors = reservationIntegrityErrors(reservation);
    return errors.length ? [{ reservationId: reservation.id, reference: reservation.reference, errors }] : [];
  });
}
function getConflicts(unitId, checkIn, checkOut, excludeReservationId = null) {
  const reservationConflicts = reservations
    .filter(reservation => reservation.id !== excludeReservationId)
    .filter(reservation => reservationUnitId(reservation) === unitId)
    .filter(isActiveReservation)
    .filter(reservation => overlaps(checkIn, checkOut, reservation.checkIn, reservation.checkOut))
    .map(reservation => ({ type: "RESERVATION", record: reservation }));
  const blockConflicts = blocks
    .filter(block => block.unitId === unitId)
    .filter(block => calendarBlockTypes.has(normalizeStatus(block.type)))
    .filter(block => overlaps(checkIn, checkOut, block.startDate, block.endDate))
    .map(block => ({ type: "BLOCK", record: block }));
  return [...reservationConflicts, ...blockConflicts];
}
function isUnitAvailable(unitId, checkIn, checkOut, excludeReservationId = null) {
  const unit = getUnitById(unitId);
  const property = getPropertyById(unit?.propertyId);
  if (!unit || !property || !isSellableUnit(unit) || normalizeStatus(property.status) !== "ACTIVE") return false;
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  return getConflicts(unitId, checkIn, checkOut, excludeReservationId).length === 0;
}
function isUnitBlockedOnDate(unitId, isoDate) {
  return blocks.some(block => block.unitId === unitId && block.startDate <= isoDate && block.endDate > isoDate);
}
function unitAvailabilityLabel(unitId) {
  const unit = getUnitById(unitId);
  const property = getPropertyById(unit?.propertyId);
  return unit && property ? `${property.code} · ${unit.code}` : unit?.code || "Unit";
}
const reservationTransitions = {
  INQUIRY: new Set(["PENDING", "CANCELLED"]),
  PENDING: new Set(["CONFIRMED", "CANCELLED"]),
  CONFIRMED: new Set(["CHECKED_IN", "NO_SHOW", "CANCELLED"]),
  CHECKED_IN: new Set(["CHECKED_OUT"]),
  CHECKED_OUT: new Set(),
  CANCELLED: new Set(),
  NO_SHOW: new Set()
};
function canTransitionReservation(reservation, nextStatus) {
  const currentStatus = normalizeStatus(reservation.status);
  return currentStatus === nextStatus || reservationTransitions[currentStatus]?.has(nextStatus);
}
function findReservation(reservationId) {
  return reservations.find(reservation => reservation.id === reservationId);
}
function createCheckoutTasks(reservation) {
  const existing = tasks.some(task => task.reservationId === reservation.id && normalizeStatus(task.category) === "HOUSEKEEPING" && normalizeStatus(task.status) !== "CANCELLED");
  if (existing) return;
  const unit = getUnitById(reservation.unitId);
  tasks.push({
    id: createId("task"),
    workspaceId: workspace.id,
    propertyId: reservation.propertyId,
    unitId: reservation.unitId,
    reservationId: reservation.id,
    category: "Housekeeping",
    title: "Post-stay cleaning",
    task: "Post-stay cleaning",
    description: `Prepare ${unit?.name || "unit"} for the next stay.`,
    assignedTo: null,
    assignee: "Housekeeping",
    dueAt: new Date().toISOString(),
    due: new Date().toISOString(),
    priority: "HIGH",
    status: "OPEN",
    statusClass: "checked",
    done: false,
    createdBy: users[0]?.id || null,
    createdAt: new Date().toISOString()
  });
  if (unit) unit.housekeepingStatus = "DIRTY";
  saveCollection("arsavaya-tasks", tasks);
  saveCollection("arsavaya-units", units);
}
function updateReservationStatus(reservationId, nextStatus) {
  const reservation = findReservation(reservationId);
  if (!reservation) return false;
  const normalizedNextStatus = normalizeStatus(nextStatus);
  if (normalizedNextStatus === "CANCELLED" && !window.confirm(`Cancel reservation ${reservation.reference}?`)) return false;
  if (!isReservationIntegrityValid(reservation)) {
    showToast("Cannot update an invalid reservation");
    return false;
  }
  if (!canTransitionReservation(reservation, normalizedNextStatus)) {
    showToast(`Cannot move ${reservation.reference} from ${titleCaseEnum(reservation.status)} to ${titleCaseEnum(normalizedNextStatus)}`);
    return false;
  }
  reservation.status = normalizedNextStatus;
  reservation.updatedAt = new Date().toISOString();
  if (normalizedNextStatus === "CHECKED_OUT") createCheckoutTasks(reservation);
  saveCollection("arsavaya-reservations", reservations);
  renderPage(activePage);
  showToast(`${reservation.reference} marked ${titleCaseEnum(normalizedNextStatus)}`);
  return true;
}
function sprint2IntegrityCheck() {
  const errors = [];
  const moneyFields = ["accommodationRevenue", "roomRevenue", "cleaningFee", "taxes", "extras", "discounts", "otaCommission", "paymentProcessingFee"];
  reservations.forEach(reservation => {
    const reservationErrors = reservationIntegrityErrors(reservation);
    if (reservationErrors.length) errors.push({ reservationId: reservation.id, type: "ID_RELATIONSHIP", fields: reservationErrors });
    if (reservation.guestId !== reservation.primaryGuestId) errors.push({ reservationId: reservation.id, type: "LEGACY_GUEST_MIRROR" });
    if (reservation.roomRevenue !== reservation.accommodationRevenue) errors.push({ reservationId: reservation.id, type: "LEGACY_REVENUE_MIRROR" });
    if (!isIsoDate(reservation.checkIn) || !isIsoDate(reservation.checkOut) || reservation.checkOut <= reservation.checkIn) errors.push({ reservationId: reservation.id, type: "DATES" });
    if (moneyFields.some(field => typeof reservation[field] !== "number" || !Number.isFinite(reservation[field]) || reservation[field] < 0)) errors.push({ reservationId: reservation.id, type: "MONEY" });
  });
  return { pass: errors.length === 0, reservationCount: reservations.length, errors };
}
function calculateNights(checkIn, checkOut) {
  return Math.max(0, Math.round((parseDate(checkOut) - parseDate(checkIn)) / 86400000));
}
function formatDateRange(checkIn, checkOut) {
  return `${shortDateFormatter.format(parseDate(checkIn))} — ${shortDateFormatter.format(parseDate(checkOut))}`;
}
function formatLongDate(value) {
  return dateFormatter.format(parseDate(value));
}
function formatCurrency(amount) {
  return `Rp ${currencyFormatter.format(Math.max(0, Number(amount) || 0))}`;
}
function reservationTotal(reservation) {
  return canonicalAccommodationRevenue(reservation) +
    Number(reservation.cleaningFee || 0) +
    Number(reservation.taxes || 0) +
    Number(reservation.extras || 0) -
    Number(reservation.discounts || 0);
}
function reservationNetRevenue(reservation) {
  return reservationTotal(reservation) -
    Number(reservation.otaCommission || 0) -
    Number(reservation.paymentProcessingFee || 0);
}
function reservationGuestCount(reservation) {
  // Infants are excluded from capacity until workspace settings make that configurable.
  return Number(reservation.adults || 0) + Number(reservation.children || 0);
}
function canonicalGuestId(reservation) {
  return reservation.primaryGuestId || reservation.guestId || null;
}
function canonicalAccommodationRevenue(reservation) {
  return Number(reservation.accommodationRevenue ?? reservation.roomRevenue ?? 0);
}
function moneyValue(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}
function isIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = parseDate(value);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() + 1 === Number(match[2]) &&
    date.getDate() === Number(match[3]);
}
function readMoneyFields(form, fieldNames) {
  const values = {};
  const invalidFields = [];
  fieldNames.forEach(fieldName => {
    const raw = String(form.get(fieldName) ?? "").trim();
    const value = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(value) || value < 0) invalidFields.push(fieldName);
    values[fieldName] = value;
  });
  return { values, invalidFields };
}
function reservationMoneyFieldNames() {
  return ["accommodationRevenue", "cleaningFee", "taxes", "extras", "discounts", "otaCommission", "paymentProcessingFee"];
}
function validateReservationDates(checkIn, checkOut) {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return "Please enter valid check-in and check-out dates";
  if (calculateNights(checkIn, checkOut) <= 0) return "Check-out must be after check-in";
  return "";
}
function validateReservationReferences(unitId, primaryGuestId, propertyId = null) {
  const unit = getUnitById(unitId);
  const property = getPropertyById(propertyId || unit?.propertyId);
  const guest = getGuestById(primaryGuestId);
  if (!unit || !property || !guest || unit.propertyId !== property.id) return "Reservation references are invalid";
  if (!isSellableUnit(unit)) return "Please select a valid sellable unit";
  return "";
}
function validateReservationCapacity(adults, children, unit) {
  if (!unit) return "Please select a valid sellable unit";
  if (!Number.isFinite(adults) || adults < 1 || !Number.isFinite(children) || children < 0) {
    return "Adults and children must be valid non-negative numbers";
  }
  if (adults + children > Number(unit.maxGuests || 0)) {
    return "Guest count exceeds the maximum capacity for this unit.";
  }
  return "";
}
function validateReservationMoney(values) {
  if (values.discounts > values.accommodationRevenue + values.cleaningFee + values.taxes + values.extras) {
    return "Discounts cannot exceed the reservation charges";
  }
  return "";
}
function nextReservationId() {
  const latestNumber = reservations.reduce((highest, reservation) => {
    const number = Number(String(reservation.reference || "").match(/(\d+)$/)?.[1]);
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return {
    id: createId("reservation"),
    reference: `ARS-${applicationDateParts().year}-${String(latestNumber + 1).padStart(6, "0")}`
  };
}
function reservationView(reservation) {
  const guest = getGuestById(canonicalGuestId(reservation));
  const unit = getReservationUnit(reservation);
  const property = getReservationProperty(reservation);
  return {
    ...reservation,
    guest,
    unit,
    property,
    propertyId: property?.id || reservation.propertyId,
    unitId: unit?.id || reservation.unitId,
    guestName: guestDisplayName(guest),
    reference: reservation.reference || reservation.id,
    propertyName: property?.name || "Unknown property",
    propertyCode: property?.code || "—",
    unitName: unit?.name || "Unknown unit",
    unitCode: unit?.code || "—",
    nights: calculateNights(reservation.checkIn, reservation.checkOut),
    dates: formatDateRange(reservation.checkIn, reservation.checkOut),
    sourceLabel: sourceLabels[reservation.source] || reservation.source,
    statusLabel: statusLabels[normalizeStatus(reservation.status)] || reservation.status,
    statusClass: statusClasses[normalizeStatus(reservation.status)] || "checked",
    total: reservationTotal(reservation),
    netRevenue: reservationNetRevenue(reservation)
  };
}
function reservationActionFooter(reservation) {
  const nextStatuses = [...(reservationTransitions[normalizeStatus(reservation.status)] || [])];
  const statusButtons = nextStatuses
    .map(status => `<button class="button button-secondary" data-action="reservation-status" data-reservation-id="${escapeHtml(reservation.id)}" data-next-status="${status}">${icon(status === "CANCELLED" ? "ban" : "arrow-right")} ${status === "CANCELLED" ? "Cancel reservation" : statusLabels[status]}</button>`)
    .join("");
  return `${statusButtons}<button class="button button-secondary" data-action="edit-reservation" data-reservation-id="${escapeHtml(reservation.id)}">${icon("pencil")} Edit</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`;
}
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}
function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}
function guestDuplicateMatches(email, phone) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedEmail && !normalizedPhone) return [];
  return guests.filter(guest => {
    const sameEmail = normalizedEmail && normalizeEmail(guest.email) === normalizedEmail;
    const samePhone = normalizedPhone && normalizePhone(guest.phone) === normalizedPhone;
    return sameEmail || samePhone;
  });
}
function guestContactSummary(guest) {
  if (!guest) return "No guest selected";
  return [guestDisplayName(guest), guest.email, guest.phone, guest.country].filter(Boolean).join(" · ");
}
function reservationPropertiesWithUnits() {
  return properties.filter(property => getUnitsByPropertyId(property.id).length);
}
function propertyOptions(selectedPropertyId) {
  return reservationPropertiesWithUnits()
    .map(property => `<option value="${escapeHtml(property.id)}" ${property.id === selectedPropertyId ? "selected" : ""}>${escapeHtml(property.code)} · ${escapeHtml(property.name)}</option>`)
    .join("");
}
function reservationUnitOptionsForProperty(propertyId, selectedUnitId = "") {
  const options = getUnitsByPropertyId(propertyId)
    .map(unit => `<option value="${escapeHtml(unit.id)}" ${unit.id === selectedUnitId ? "selected" : ""}>${escapeHtml(unit.code)} · ${escapeHtml(unit.name)}</option>`)
    .join("");
  return options || `<option value="">No active units for this property</option>`;
}
function updateReservationUnitOptions(form, selectedUnitId = "") {
  const propertyId = form.querySelector("[name='propertyId']")?.value || "";
  const unitSelect = form.querySelector("[name='unitId']");
  if (!unitSelect) return;
  const currentUnit = getUnitById(selectedUnitId);
  const preferredUnitId = currentUnit?.propertyId === propertyId ? selectedUnitId : "";
  unitSelect.innerHTML = reservationUnitOptionsForProperty(propertyId, preferredUnitId);
  unitSelect.disabled = !getUnitsByPropertyId(propertyId).length;
}
function updateExistingGuestSummary(form) {
  const summary = form.querySelector("[data-existing-guest-summary]");
  if (!summary) return;
  const guest = getGuestById(form.querySelector("[name='primaryGuestId']")?.value);
  summary.textContent = guestContactSummary(guest);
}
function setReservationGuestMode(form, mode) {
  const selectedMode = mode === "new" ? "new" : "existing";
  form.querySelectorAll("[data-guest-mode-panel]").forEach(panel => {
    panel.hidden = panel.dataset.guestModePanel !== selectedMode;
  });
  const existingGuestSelect = form.querySelector("[name='primaryGuestId']");
  const newFirstName = form.querySelector("[name='newFirstName']");
  if (existingGuestSelect) {
    existingGuestSelect.disabled = selectedMode !== "existing";
    existingGuestSelect.required = selectedMode === "existing";
  }
  if (newFirstName) newFirstName.required = selectedMode === "new";
  updateExistingGuestSummary(form);
}
function showDuplicateGuestWarning(form, matches) {
  const warning = form.querySelector("[data-duplicate-warning]");
  if (!warning) return;
  warning.hidden = false;
  warning.innerHTML = `<strong>Possible duplicate guest</strong><span>${matches.map(guest => escapeHtml(guestContactSummary(guest))).join("<br>")}</span><small>Choose whether to use an existing guest or create a separate guest record.</small><div class="duplicate-warning-actions"><button type="button" class="button button-secondary" data-duplicate-choice="use-existing">${icon("user-check")} Use existing guest</button><button type="button" class="button button-ghost" data-duplicate-choice="create-separate">${icon("user-plus")} Create separate guest</button></div>`;
  refreshIcons();
}
function clearDuplicateGuestWarning(form) {
  const warning = form.querySelector("[data-duplicate-warning]");
  const decision = form.querySelector("[name='duplicateDecision']");
  const duplicateGuestId = form.querySelector("[name='duplicateGuestId']");
  if (warning) {
    warning.hidden = true;
    warning.innerHTML = "";
  }
  if (decision) decision.value = "";
  if (duplicateGuestId) duplicateGuestId.value = "";
}
function bindReservationModalActions(form) {
  if (!form) return;
  form.querySelectorAll("[name='guestMode']").forEach(input => input.addEventListener("change", () => {
    clearDuplicateGuestWarning(form);
    setReservationGuestMode(form, input.value);
  }));
  form.querySelector("[name='primaryGuestId']")?.addEventListener("change", () => updateExistingGuestSummary(form));
  form.querySelector("[name='propertyId']")?.addEventListener("change", () => updateReservationUnitOptions(form));
  ["newEmail", "newPhone"].forEach(name => form.querySelector(`[name='${name}']`)?.addEventListener("input", () => clearDuplicateGuestWarning(form)));
  form.querySelector("[data-duplicate-warning]")?.addEventListener("click", event => {
    const choice = event.target.closest("[data-duplicate-choice]")?.dataset.duplicateChoice;
    if (!choice) return;
    const decision = form.querySelector("[name='duplicateDecision']");
    if (decision) decision.value = choice;
    if (choice === "use-existing") {
      const firstMatch = guestDuplicateMatches(form.querySelector("[name='newEmail']")?.value, form.querySelector("[name='newPhone']")?.value)[0];
      const guestSelect = form.querySelector("[name='primaryGuestId']");
      const duplicateGuestId = form.querySelector("[name='duplicateGuestId']");
      if (guestSelect && firstMatch) {
        guestSelect.value = firstMatch.id;
        updateExistingGuestSummary(form);
      }
      if (duplicateGuestId && firstMatch) duplicateGuestId.value = firstMatch.id;
    }
    const warning = form.querySelector("[data-duplicate-warning]");
    if (warning) {
      warning.hidden = true;
      warning.innerHTML = "";
    }
  });
  setReservationGuestMode(form, form.querySelector("[name='guestMode']:checked")?.value || "existing");
}
function propertyUnitSummary(propertyId) {
  const propertyUnits = getUnitsByPropertyId(propertyId);
  if (propertyUnits.length === 1) return propertyUnits[0].name;
  return `${propertyUnits.length} units`;
}
function propertyNextAction(propertyId) {
  const propertyUnitIds = new Set(getUnitsByPropertyId(propertyId).map(unit => unit.id));
  const upcoming = reservations
    .filter(reservation => propertyUnitIds.has(reservationUnitId(reservation)) && isActiveReservation(reservation))
    .filter(reservation => reservation.checkIn >= todayIso() || reservation.checkOut >= todayIso())
    .sort((a, b) => (a.checkIn >= todayIso() ? a.checkIn : a.checkOut).localeCompare(b.checkIn >= todayIso() ? b.checkIn : b.checkOut))[0];
  if (!upcoming) return "No upcoming stay";
  if (upcoming.checkOut === todayIso() || upcoming.checkOut > todayIso() && upcoming.checkIn < todayIso()) return `Check-out ${relativeDateLabel(upcoming.checkOut)}`;
  return `Check-in ${relativeDateLabel(upcoming.checkIn)}`;
}
function propertyOperationalStatus(property) {
  if (normalizeStatus(property.status) !== "ACTIVE") return "maintenance";
  const today = todayIso();
  const occupied = getUnitsByPropertyId(property.id).some(unit => reservations.some(reservation =>
    reservationUnitId(reservation) === unit.id &&
    isActiveReservation(reservation) &&
    reservation.checkIn <= today &&
    reservation.checkOut > today
  ));
  const blocked = getUnitsByPropertyId(property.id).some(unit => isUnitBlockedOnDate(unit.id, today));
  return occupied ? "occupied" : blocked ? "maintenance" : "available";
}
function taskUnitLabel(task) {
  const unit = getUnitById(task.unitId);
  const property = getPropertyById(unit?.propertyId);
  return unit && property ? `${property.code} · ${unit.code}` : "Unassigned unit";
}
function guestLatestStay(guestId) {
  const latest = reservations
    .filter(reservation => canonicalGuestId(reservation) === guestId && isActiveReservation(reservation))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn))[0];
  if (!latest) return { stay: "No stay yet", last: "—" };
  const view = reservationView(latest);
  return { stay: `${view.propertyName} · ${view.nights} nights`, last: dateFormatter.format(parseDate(latest.checkIn)) };
}
function propertyMetrics(propertyId) {
  const { monthStart, monthEnd, daysInMonth } = currentMonthBounds();
  const validReservations = reservations.filter(reservation => getReservationProperty(reservation)?.id === propertyId && isActiveReservation(reservation));
  const bookedNights = validReservations.reduce((total, reservation) => {
    const start = reservation.checkIn > monthStart ? reservation.checkIn : monthStart;
    const end = reservation.checkOut < monthEnd ? reservation.checkOut : monthEnd;
    return total + (end > start ? calculateNights(start, end) : 0);
  }, 0);
  const revenue = validReservations.reduce((total, reservation) => total + reservationNetRevenue(reservation), 0);
  const inventoryUnits = getUnitsByPropertyId(propertyId).length;
  return { occupancy: inventoryUnits ? Math.min(100, Math.round((bookedNights / (inventoryUnits * daysInMonth)) * 100)) : 0, revenue };
}
function monthlyPortfolioMetrics() {
  const { monthStart, monthEnd, daysInMonth } = currentMonthBounds();
  const activeReservations = reservations.filter(isActiveReservation);
  const bookedNights = activeReservations.reduce((total, reservation) => {
    const start = reservation.checkIn > monthStart ? reservation.checkIn : monthStart;
    const end = reservation.checkOut < monthEnd ? reservation.checkOut : monthEnd;
    return total + (end > start ? calculateNights(start, end) : 0);
  }, 0);
  const accommodationRevenueTotal = activeReservations.reduce((total, reservation) => total + canonicalAccommodationRevenue(reservation), 0);
  const netRevenue = activeReservations.reduce((total, reservation) => total + reservationNetRevenue(reservation), 0);
  const availableNights = units.filter(isSellableUnit).length * daysInMonth;
  return {
    bookings: activeReservations.length,
    occupancyRate: availableNights ? Math.round((bookedNights / availableNights) * 100) : 0,
    accommodationRevenue: accommodationRevenueTotal,
    netRevenue,
    adr: bookedNights ? Math.round(accommodationRevenueTotal / bookedNights) : 0,
    bookedNights
  };
}
function monthlyOccupancyTrend() {
  const currentDate = parseDate(todayIso());
  const currentYear = currentDate.getFullYear();
  return Array.from({ length: 9 }, (_, monthIndex) => {
    const monthNumber = currentDate.getMonth() - 8 + monthIndex;
    const monthStartDate = new Date(currentYear, monthNumber, 1);
    const monthEndDate = new Date(currentYear, monthNumber + 1, 1);
    const monthStart = dateToIso(monthStartDate);
    const monthEnd = dateToIso(monthEndDate);
    const daysInMonth = Math.round((monthEndDate - monthStartDate) / 86400000);
    const bookedNights = reservations
      .filter(reservation => isActiveReservation(reservation) && reservation.checkIn < monthEnd && reservation.checkOut > monthStart)
      .reduce((total, reservation) => {
        const start = reservation.checkIn > monthStart ? reservation.checkIn : monthStart;
        const end = reservation.checkOut < monthEnd ? reservation.checkOut : monthEnd;
        return total + (end > start ? calculateNights(start, end) : 0);
      }, 0);
    const activeUnitCount = units.filter(isSellableUnit).length;
    return activeUnitCount && daysInMonth ? Math.round((bookedNights / (activeUnitCount * daysInMonth)) * 100) : 0;
  });
}
function monthlyTrendLabels() {
  const currentDate = parseDate(todayIso());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  return Array.from({ length: 9 }, (_, index) => applicationMonthLabel(new Date(currentYear, currentMonth - 8 + index, 1)));
}
function currentMonthBounds() {
  const now = parseDate(todayIso());
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    monthStart: dateToIso(monthStartDate),
    monthEnd: dateToIso(monthEndDate),
    daysInMonth: Math.round((monthEndDate - monthStartDate) / 86400000)
  };
}
function dateToIso(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function todayIso() {
  const parts = applicationDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function calendarFocusDateIso() {
  return isIsoDate(calendarFocusIso) ? calendarFocusIso : todayIso();
}
function addCalendarDays(isoDate, days) {
  const date = parseDate(isoDate);
  date.setDate(date.getDate() + Number(days || 0));
  return dateToIso(date);
}
function addCalendarMonths(isoDate, months) {
  const date = parseDate(isoDate);
  const target = new Date(date.getFullYear(), date.getMonth() + Number(months || 0), 1);
  return dateToIso(target);
}
function calendarDateForDisplay(isoDate) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}
function calendarMonthLabel(isoDate) {
  return applicationMonthFormatter.format(calendarDateForDisplay(isoDate));
}
function getCalendarStart() {
  const focus = parseDate(calendarFocusDateIso());
  if (calendarView === "Month") return new Date(focus.getFullYear(), focus.getMonth(), 1);
  if (calendarView === "Day") return focus;
  focus.setDate(focus.getDate() - focus.getDay());
  return focus;
}
function calendarDaysForView() {
  const start = getCalendarStart();
  const dayCount = calendarView === "Month"
    ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    : calendarView === "Day" ? 1 : 7;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = dateToIso(date);
    return {
      day: new Intl.DateTimeFormat("en-US", { timeZone: applicationTimeZone, weekday: "short" }).format(calendarDateForDisplay(iso)).toUpperCase(),
      date: String(date.getDate()),
      iso,
      today: iso === todayIso()
    };
  });
}
function miniCalendarDays() {
  const currentDate = parseDate(calendarFocusDateIso());
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = dateToIso(date);
    return {
      iso,
      day: String(date.getDate()),
      muted: date.getMonth() !== monthStart.getMonth(),
      today: iso === todayIso(),
      selected: iso === calendarFocusDateIso()
    };
  });
}
function calendarEventsForUnit(unitId, days) {
  const viewStart = days[0].iso;
  const viewEndExclusive = addCalendarDays(days[days.length - 1].iso, 1);
  const reservationEvents = reservations
    .filter(reservation => reservationUnitId(reservation) === unitId && isActiveReservation(reservation) && reservation.checkIn < viewEndExclusive && reservation.checkOut > viewStart)
    .map(reservation => {
      const view = reservationView(reservation);
      return {
        kind: "reservation",
        reservation,
        text: `${view.guestName} · ${view.nights}n`,
        cls: reservation.source === "booking_com" ? "blue" : reservation.source === "airbnb" ? "coral" : "",
        startDate: reservation.checkIn,
        endDate: reservation.checkOut
      };
    });
  const blockEvents = blocks
    .filter(block => block.unitId === unitId && block.startDate < viewEndExclusive && block.endDate > viewStart)
    .map(block => ({
      kind: "block",
      block,
      text: `${calendarBlockTypeLabels[normalizeStatus(block.type)] || "Blocked"}${block.reason ? ` · ${block.reason}` : ""}`,
      cls: `calendar-block ${normalizeStatus(block.type).toLowerCase().replaceAll("_", "-")}`,
      startDate: block.startDate,
      endDate: block.endDate
    }));
  return [...reservationEvents, ...blockEvents].map(event => {
    const startIndex = Math.max(0, days.findIndex(day => day.iso >= event.startDate));
    const visibleStart = event.startDate > viewStart ? event.startDate : viewStart;
    const visibleEnd = event.endDate < viewEndExclusive ? event.endDate : viewEndExclusive;
    const span = Math.max(1, Math.min(days.length - startIndex, calculateNights(visibleStart, visibleEnd)));
    return { ...event, start: startIndex, span };
  }).sort((a, b) => a.start - b.start);
}
function portfolioMetrics() {
  const today = todayIso();
  const activeReservations = reservations.filter(isActiveReservation);
  const occupiedToday = activeReservations.filter(reservation => reservation.checkIn <= today && reservation.checkOut > today);
  const arrivalsToday = activeReservations.filter(reservation => reservation.checkIn === today);
  const departuresToday = activeReservations.filter(reservation => reservation.checkOut === today);
  const occupiedUnitIds = new Set(occupiedToday.map(reservation => reservationUnitId(reservation)).filter(Boolean));
  const blockedUnitIds = new Set(units.filter(isSellableUnit).filter(unit => isUnitBlockedOnDate(unit.id, today)).map(unit => unit.id));
  const revenue = activeReservations.reduce((total, reservation) => total + reservationNetRevenue(reservation), 0);
  const inHouseGuests = occupiedToday.reduce((total, reservation) => total + reservation.adults + reservation.children, 0);
  const totalUnits = units.filter(isSellableUnit).length;
  const occupied = occupiedUnitIds.size;
  return {
    totalProperties: properties.length,
    totalUnits,
    occupied,
    blocked: blockedUnitIds.size,
    available: Math.max(0, totalUnits - occupied - blockedUnitIds.size),
    occupancyRate: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
    arrivalsToday: arrivalsToday.length,
    departuresToday: departuresToday.length,
    inHouseGuests,
    revenue
  };
}
function text(key) { return languageCopy[language][key] || key; }
function navText(page) { return languageCopy[language].nav[page] || page; }
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
function applyLanguage() {
  document.documentElement.lang = language === "id" ? "id" : "en";
  document.querySelectorAll("[data-nav-key]").forEach(item => { item.textContent = navText(item.dataset.navKey); });
  document.querySelector(".nav-label").textContent = text("workspace");
  document.querySelector(".operations-label").textContent = text("operations");
  breadcrumbPage.textContent = navText(activePage);
  if (topbarDate) topbarDate.textContent = applicationDateLabel();
}
function persistLanguage(nextLanguage) {
  language = nextLanguage === "id" ? "id" : "en";
  pendingLanguage = language;
  workspace.language = language;
  settings.language = language;
  try {
    localStorage.setItem("arsavaya-language", language);
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
  saveCollection("arsavaya-workspace", workspace);
  saveCollection("arsavaya-settings", settings);
  applyLanguage();
  renderPage(activePage);
  showToast(text("saved"));
}
function showToast(message) {
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}
function exportRows(filename, headers, rows) {
  const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} downloaded`);
}
function globalSearch(value) {
  const query = value.trim().toLowerCase();
  if (!query) return;
  const reservationMatch = reservations.find(row => {
    const view = reservationView(row);
    return `${row.reference} ${row.id} ${row.externalReservationId || ""} ${view.guestName} ${view.propertyName} ${view.propertyCode} ${view.unitName} ${view.unitCode}`.toLowerCase().includes(query);
  });
  if (reservationMatch) {
    reservationSearch = query;
    renderPage("reservations");
    showToast(`Showing reservation for ${reservationView(reservationMatch).guestName}`);
    return;
  }
  const propertyMatch = properties.find(row => `${row.code} ${row.name} ${row.location}`.toLowerCase().includes(query));
  if (propertyMatch) {
    propertyFilter = "all";
    renderPage("properties");
    showToast(`Showing ${propertyMatch.code}`);
    return;
  }
  const guestMatch = guests.find(row => `${guestDisplayName(row)} ${row.email} ${row.phone} ${row.country}`.toLowerCase().includes(query));
  if (guestMatch) {
    guestSearch = query;
    renderPage("guests");
    showToast(`Showing guest ${guestDisplayName(guestMatch)}`);
    return;
  }
  showToast(`No records found for "${value.trim()}"`);
}
function statusForProperty(status) {
  return status === "occupied" ? ["Occupied", "confirmed"] : status === "maintenance" ? ["Maintenance", "pending"] : ["Available", "checked"];
}
function sourceClass(source) {
  return source.toLowerCase().replace(".", "").replace(" ", "");
}
function openDetail(title, eyebrow, rows, footer = "") {
  document.getElementById("drawerTitle").textContent = title;
  document.getElementById("drawerEyebrow").textContent = eyebrow;
  document.getElementById("drawerBody").innerHTML = rows.map(row => `<div class="detail-row"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(row[1])}</strong></div>`).join("");
  document.getElementById("drawerFooter").innerHTML = footer || `<button class="button button-primary" data-close-drawer>${icon("check")} Mark reviewed</button>`;
  drawerBackdrop.hidden = false;
  refreshIcons();
}
function closeDrawer() {
  drawerBackdrop.hidden = true;
}
function pageHeading(meta, title, copy, action = "") {
  return `<div class="page-heading"><div><span class="eyebrow">${meta.eyebrow}</span><h1>${title}</h1><p>${copy}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ""}</div>`;
}
function addReservationButton() {
  return `<button class="button button-primary" data-open-modal>${icon("plus")} Add reservation</button>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}
function ownerName(ownerId) {
  return owners.find(owner => owner.id === ownerId)?.name || "Unassigned owner";
}
function ownerProperties(ownerId) {
  return properties.filter(property => property.ownerId === ownerId);
}
function managementAgreementForProperty(propertyId) {
  return managementAgreements.find(agreement => agreement.propertyId === propertyId && normalizeStatus(agreement.status) === "ACTIVE");
}
function titleCaseEnum(value) {
  return String(value || "").toLowerCase().replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}
function formatTaskDue(value) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
function taskStatusClass(task) {
  return normalizeStatus(task.status) === "COMPLETED" ? "confirmed" : normalizeStatus(task.status) === "OPEN" ? "pending" : "checked";
}
function taskPriorityClass(task) {
  return normalizeStatus(task.priority).toLowerCase();
}
function modalShell(eyebrow, title, form) {
  modalBackdrop.querySelector(".modal").innerHTML = `
    <div class="modal-header">
      <div><span class="eyebrow">${eyebrow}</span><h2 id="modalTitle">${title}</h2></div>
      <button class="icon-button close-modal" aria-label="Close dialog">${icon("x")}</button>
    </div>
    ${form}`;
  refreshIcons();
}
function renderReservationModal() {
  const selectedPropertyId = reservationPropertiesWithUnits()[0]?.id || "";
  const selectedUnitId = getUnitsByPropertyId(selectedPropertyId)[0]?.id || "";
  modalShell("New entry", "Add reservation", `
    <form id="reservationForm" data-entity-form="reservation">
      <input type="hidden" name="duplicateDecision" value="" />
      <input type="hidden" name="duplicateGuestId" value="" />
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Guest</span><strong>Who is staying?</strong></div>
        <div class="guest-mode-options">
          <label class="choice-option"><input type="radio" name="guestMode" value="existing" checked /><span>Select existing guest</span></label>
          <label class="choice-option"><input type="radio" name="guestMode" value="new" /><span>Create new guest</span></label>
        </div>
        <div data-guest-mode-panel="existing">
          <label class="field"><span>Existing guest</span><select name="primaryGuestId" required>${reservationGuestOptions("")}</select></label>
          <p class="field-hint" data-existing-guest-summary>${guestContactSummary(guests[0])}</p>
        </div>
        <div data-guest-mode-panel="new" hidden>
          <div class="form-grid">
            <label class="field"><span>First name</span><input name="newFirstName" placeholder="e.g. Maria" /></label>
            <label class="field"><span>Last name</span><input name="newLastName" placeholder="e.g. Garcia" /></label>
            <label class="field"><span>Email</span><input name="newEmail" type="email" placeholder="Optional" /></label>
            <label class="field"><span>Phone</span><input name="newPhone" placeholder="Optional" /></label>
            <label class="field"><span>Country</span><input name="newCountry" placeholder="Optional" /></label>
          </div>
        </div>
        <div class="duplicate-warning" data-duplicate-warning hidden></div>
      </section>
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Stay</span><strong>Property and inventory</strong></div>
        <div class="form-grid">
          <label class="field"><span>Property</span><select name="propertyId" required>${propertyOptions(selectedPropertyId)}</select></label>
          <label class="field"><span>Unit</span><select name="unitId" required>${reservationUnitOptionsForProperty(selectedPropertyId, selectedUnitId)}</select></label>
          <label class="field"><span>Check-in</span><input name="checkin" type="date" value="${todayIso()}" required /></label>
          <label class="field"><span>Check-out</span><input name="checkout" type="date" required /></label>
          <label class="field"><span>Adults</span><input name="adults" type="number" min="1" value="2" required /></label>
          <label class="field"><span>Children</span><input name="children" type="number" min="0" value="0" required /></label>
          <label class="field"><span>Infants</span><input name="infants" type="number" min="0" value="0" required /></label>
          <label class="field"><span>Estimated arrival time</span><input name="estimatedArrivalTime" type="time" /></label>
        </div>
      </section>
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Booking</span><strong>Reservation details</strong></div>
        <div class="form-grid">
          <label class="field"><span>Booking source</span><select name="source"><option value="direct">Direct</option><option value="airbnb">Airbnb</option><option value="booking_com">Booking.com</option><option value="agoda">Agoda</option><option value="traveloka">Traveloka</option><option value="other">Other</option></select></label>
          <label class="field"><span>External reservation ID</span><input name="externalReservationId" placeholder="Optional channel reference" /></label>
          <label class="field"><span>Initial status</span><select name="status"><option value="PENDING" selected>Pending</option><option value="INQUIRY">Inquiry</option><option value="CONFIRMED">Confirmed</option></select></label>
          <label class="field"><span>Payment status</span><select name="paymentStatus"><option value="UNPAID">Unpaid</option><option value="PARTIAL">Partial</option><option value="PAID">Paid</option><option value="REFUNDED">Refunded</option></select></label>
        </div>
      </section>
      ${reservationFinancialFields()}
      ${reservationNotesFields()}
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("plus")} Create reservation</button></div>
    </form>`);
  setReservationGuestMode(modalBackdrop.querySelector("form"), "existing");
  bindReservationModalActions(modalBackdrop.querySelector("form"));
}
function reservationFinancialFields(reservation = {}) {
  return `<section class="form-section"><div class="form-section-heading"><span class="eyebrow">Financials</span><strong>Booking value</strong></div>
    <div class="form-grid">
      <label class="field"><span>Accommodation revenue</span><input name="accommodationRevenue" type="number" min="0" value="${moneyValue(canonicalAccommodationRevenue(reservation))}" required /></label>
      <label class="field"><span>Cleaning fee</span><input name="cleaningFee" type="number" min="0" value="${moneyValue(reservation.cleaningFee)}" /></label>
      <label class="field"><span>Taxes</span><input name="taxes" type="number" min="0" value="${moneyValue(reservation.taxes)}" /></label>
      <label class="field"><span>Extras</span><input name="extras" type="number" min="0" value="${moneyValue(reservation.extras)}" /></label>
      <label class="field"><span>Discounts</span><input name="discounts" type="number" min="0" value="${moneyValue(reservation.discounts)}" /></label>
      <label class="field"><span>OTA commission</span><input name="otaCommission" type="number" min="0" value="${moneyValue(reservation.otaCommission)}" /></label>
      <label class="field"><span>Payment processing fee</span><input name="paymentProcessingFee" type="number" min="0" value="${moneyValue(reservation.paymentProcessingFee)}" /></label>
    </div>
  </section>`;
}
function reservationNotesFields(reservation = {}) {
  return `<section class="form-section"><div class="form-section-heading"><span class="eyebrow">Notes</span><strong>Arrival context</strong></div>
    <div class="form-grid">
      <label class="field field-wide"><span>Internal notes</span><textarea name="internalNotes" rows="3" placeholder="Visible to the Arsavaya team">${escapeHtml(reservation.internalNotes || "")}</textarea></label>
      <label class="field field-wide"><span>Guest notes</span><textarea name="guestNotes" rows="3" placeholder="Guest requests and preferences">${escapeHtml(reservation.guestNotes || "")}</textarea></label>
    </div>
  </section>`;
}
function openReservationModal() {
  renderReservationModal();
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("[name='primaryGuestId']")?.focus();
}
function reservationGuestOptions(selectedGuestId) {
  return guests
    .map(guest => `<option value="${escapeHtml(guest.id)}" ${guest.id === selectedGuestId ? "selected" : ""}>${escapeHtml(guestContactSummary(guest))}</option>`)
    .join("");
}
function reservationUnitOptions(selectedUnitId) {
  return units.filter(isSellableUnit).map(unit => {
    const property = getPropertyById(unit.propertyId);
    return `<option value="${escapeHtml(unit.id)}" ${unit.id === selectedUnitId ? "selected" : ""}>${escapeHtml(property?.name || "Property")} · ${escapeHtml(unit.name)}</option>`;
  }).join("");
}
function reservationStatusOptions(selectedStatus) {
  const currentStatus = normalizeStatus(selectedStatus);
  const availableStatuses = [currentStatus, ...(reservationTransitions[currentStatus] ? [...reservationTransitions[currentStatus]] : [])];
  return [...new Set(availableStatuses)]
    .map(status => `<option value="${status}" ${status === normalizeStatus(selectedStatus) ? "selected" : ""}>${statusLabels[status]}</option>`)
    .join("");
}
function reservationPaymentOptions(selectedStatus) {
  return ["UNPAID", "PARTIAL", "PAID", "REFUNDED"]
    .map(status => `<option value="${status}" ${status === normalizeStatus(selectedStatus) ? "selected" : ""}>${titleCaseEnum(status)}</option>`)
    .join("");
}
function openReservationEditModal(reservationId) {
  const reservation = findReservation(reservationId);
  if (!reservation) return;
  const guestId = canonicalGuestId(reservation);
  const propertyId = reservation.propertyId || getUnitById(reservation.unitId)?.propertyId || "";
  modalShell("Reservation management", `Edit ${escapeHtml(reservation.reference)}`, `
    <form id="reservationEditForm" data-entity-form="reservation-edit" data-reservation-id="${escapeHtml(reservation.id)}">
      <input type="hidden" name="reservationId" value="${escapeHtml(reservation.id)}" />
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Guest</span><strong>Reservation guest</strong></div>
        <label class="field"><span>Primary guest</span><select name="primaryGuestId" required>${reservationGuestOptions(guestId)}</select></label>
        <p class="field-hint" data-existing-guest-summary>${guestContactSummary(getGuestById(guestId))}</p>
      </section>
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Stay</span><strong>Property and inventory</strong></div>
        <div class="form-grid">
          <label class="field"><span>Property</span><select name="propertyId" required>${propertyOptions(propertyId)}</select></label>
          <label class="field"><span>Unit</span><select name="unitId" required>${reservationUnitOptionsForProperty(propertyId, reservation.unitId)}</select></label>
          <label class="field"><span>Check-in</span><input name="checkin" type="date" value="${escapeHtml(reservation.checkIn)}" required /></label>
          <label class="field"><span>Check-out</span><input name="checkout" type="date" value="${escapeHtml(reservation.checkOut)}" required /></label>
          <label class="field"><span>Adults</span><input name="adults" type="number" min="1" value="${Number(reservation.adults || 1)}" required /></label>
          <label class="field"><span>Children</span><input name="children" type="number" min="0" value="${Number(reservation.children || 0)}" required /></label>
          <label class="field"><span>Infants</span><input name="infants" type="number" min="0" value="${Number(reservation.infants || 0)}" required /></label>
          <label class="field"><span>Estimated arrival time</span><input name="estimatedArrivalTime" type="time" value="${escapeHtml(reservation.estimatedArrivalTime || "")}" /></label>
        </div>
      </section>
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Booking</span><strong>Reservation details</strong></div>
        <div class="form-grid">
          <label class="field"><span>Booking source</span><select name="source"><option value="direct" ${reservation.source === "direct" ? "selected" : ""}>Direct</option><option value="airbnb" ${reservation.source === "airbnb" ? "selected" : ""}>Airbnb</option><option value="booking_com" ${reservation.source === "booking_com" ? "selected" : ""}>Booking.com</option><option value="agoda" ${reservation.source === "agoda" ? "selected" : ""}>Agoda</option><option value="traveloka" ${reservation.source === "traveloka" ? "selected" : ""}>Traveloka</option><option value="other" ${reservation.source === "other" ? "selected" : ""}>Other</option></select></label>
          <label class="field"><span>External reservation ID</span><input name="externalReservationId" value="${escapeHtml(reservation.externalReservationId || "")}" /></label>
          <label class="field"><span>Status</span><select name="status">${reservationStatusOptions(reservation.status)}</select></label>
          <label class="field"><span>Payment status</span><select name="paymentStatus">${reservationPaymentOptions(reservation.paymentStatus)}</select></label>
        </div>
      </section>
      ${reservationFinancialFields(reservation)}
      ${reservationNotesFields(reservation)}
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("save")} Save changes</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("select")?.focus();
  bindReservationModalActions(modalBackdrop.querySelector("form"));
}
function openOwnerModal() {
  modalShell("Owner directory", "Add owner", `
    <form data-entity-form="owner">
      <div class="form-grid">
        <label class="field"><span>Owner name</span><input name="name" required placeholder="e.g. Made Wirawan" /></label>
        <label class="field"><span>Owner code</span><input name="ownerCode" placeholder="OWN-003" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" /></label>
        <label class="field"><span>Phone</span><input name="phone" /></label>
        <label class="field"><span>Address</span><input name="address" /></label>
        <label class="field"><span>Status</span><select name="status"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
      </div>
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("plus")} Create owner</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("input")?.focus();
}
function openPropertyModal() {
  const ownerOptions = owners.filter(owner => normalizeStatus(owner.status) === "ACTIVE").map(owner => `<option value="${owner.id}">${escapeHtml(owner.name)} · ${escapeHtml(owner.ownerCode)}</option>`).join("");
  modalShell("Portfolio setup", "Add property", `
    <form data-entity-form="property">
      <div class="form-grid">
        <label class="field"><span>Property name</span><input name="name" required placeholder="e.g. Villa Samara" /></label>
        <label class="field"><span>Property code</span><input name="code" required placeholder="ARSA-007" /></label>
        <label class="field"><span>Location</span><input name="location" required placeholder="Sanur, Bali" /></label>
        <label class="field"><span>Owner</span><select name="ownerId" required>${ownerOptions || '<option value="">Create an owner first</option>'}</select></label>
        <label class="field"><span>Property type</span><select name="propertyType"><option value="STANDALONE">Standalone villa</option><option value="COMPLEX">Villa complex</option></select></label>
        <label class="field"><span>First unit name</span><input name="unitName" value="Entire Villa" required /></label>
      </div>
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("plus")} Create property</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("input")?.focus();
}
function openUnitModal(propertyId) {
  const property = getPropertyById(propertyId);
  if (!property) return;
  modalShell("Inventory setup", `Add unit to ${escapeHtml(property.code)}`, `
    <form data-entity-form="unit">
      <input type="hidden" name="propertyId" value="${escapeHtml(property.id)}" />
      <div class="form-grid">
        <label class="field"><span>Unit code</span><input name="code" required placeholder="UNIT-02" /></label>
        <label class="field"><span>Unit name</span><input name="name" required placeholder="Unit 02" /></label>
        <label class="field"><span>Bedrooms</span><input name="bedrooms" type="number" min="0" value="1" /></label>
        <label class="field"><span>Max guests</span><input name="maxGuests" type="number" min="1" value="2" /></label>
        <label class="field"><span>Base rate</span><input name="baseRate" type="number" min="0" value="0" /></label>
        <label class="field"><span>Status</span><select name="status"><option value="ACTIVE">Active</option><option value="OUT_OF_ORDER">Out of order</option><option value="INACTIVE">Inactive</option></select></label>
      </div>
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("plus")} Create unit</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("input")?.focus();
}
function blockPropertyOptions(selectedPropertyId = "") {
  return reservationPropertiesWithUnits()
    .map(property => `<option value="${escapeHtml(property.id)}" ${property.id === selectedPropertyId ? "selected" : ""}>${escapeHtml(property.code)} · ${escapeHtml(property.name)}</option>`)
    .join("");
}
function blockUnitOptionsForProperty(propertyId, selectedUnitId = "") {
  return getUnitsByPropertyId(propertyId)
    .map(unit => `<option value="${escapeHtml(unit.id)}" ${unit.id === selectedUnitId ? "selected" : ""}>${escapeHtml(unit.code)} · ${escapeHtml(unit.name)}</option>`)
    .join("") || `<option value="">No active units for this property</option>`;
}
function updateCalendarBlockUnitOptions(form, selectedUnitId = "") {
  const propertyId = form.querySelector("[name='propertyId']")?.value || "";
  const unitSelect = form.querySelector("[name='unitId']");
  if (!unitSelect) return;
  const currentUnit = getUnitById(selectedUnitId);
  const preferredUnitId = currentUnit?.propertyId === propertyId ? selectedUnitId : "";
  unitSelect.innerHTML = blockUnitOptionsForProperty(propertyId, preferredUnitId);
  unitSelect.disabled = !getUnitsByPropertyId(propertyId).length;
}
function bindCalendarBlockModalActions(form) {
  if (!form) return;
  form.querySelector("[name='propertyId']")?.addEventListener("change", () => updateCalendarBlockUnitOptions(form));
  updateCalendarBlockUnitOptions(form, form.querySelector("[name='unitId']")?.value || "");
}
function openCalendarBlockModal() {
  const selectedPropertyId = reservationPropertiesWithUnits()[0]?.id || "";
  const selectedUnitId = getUnitsByPropertyId(selectedPropertyId)[0]?.id || "";
  const tomorrow = new Date(parseDate(todayIso()));
  tomorrow.setDate(tomorrow.getDate() + 1);
  modalShell("Availability management", "Block calendar dates", `
    <form data-entity-form="calendar-block">
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Inventory</span><strong>Choose the unit to block</strong></div>
        <div class="form-grid">
          <label class="field"><span>Property</span><select name="propertyId" required>${blockPropertyOptions(selectedPropertyId)}</select></label>
          <label class="field"><span>Unit</span><select name="unitId" required>${blockUnitOptionsForProperty(selectedPropertyId, selectedUnitId)}</select></label>
        </div>
      </section>
      <section class="form-section"><div class="form-section-heading"><span class="eyebrow">Block</span><strong>Availability block</strong></div>
        <div class="form-grid">
          <label class="field"><span>Type</span><select name="type" required>${[...calendarBlockTypes].map(type => `<option value="${type}">${calendarBlockTypeLabels[type]}</option>`).join("")}</select></label>
          <label class="field"><span>Reason</span><input name="reason" required placeholder="e.g. Owner visit or pool maintenance" /></label>
          <label class="field"><span>Start date</span><input name="startDate" type="date" value="${todayIso()}" required /></label>
          <label class="field"><span>End date</span><input name="endDate" type="date" value="${dateToIso(tomorrow)}" required /></label>
          <label class="field field-wide"><span>Notes</span><textarea name="notes" rows="3" placeholder="Optional operational context"></textarea></label>
        </div>
      </section>
      <p class="field-hint">Blocked dates cannot receive new reservations. The end date is exclusive, matching reservation check-out logic.</p>
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("lock-keyhole")} Block dates</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  bindCalendarBlockModalActions(modalBackdrop.querySelector("form"));
  modalBackdrop.querySelector("[name='reason']")?.focus();
}
function openGuestModal() {
  modalShell("Guest directory", "Add guest", `
    <form data-entity-form="guest">
      <div class="form-grid">
        <label class="field"><span>First name</span><input name="firstName" required /></label>
        <label class="field"><span>Last name</span><input name="lastName" /></label>
        <label class="field"><span>Email</span><input name="email" type="email" /></label>
        <label class="field"><span>Phone</span><input name="phone" /></label>
        <label class="field"><span>Country</span><input name="country" /></label>
        <label class="field"><span>Language</span><select name="language"><option value="en">English</option><option value="id">Bahasa Indonesia</option></select></label>
      </div>
      <div class="modal-footer"><button type="button" class="button button-ghost close-modal">Cancel</button><button type="submit" class="button button-primary">${icon("plus")} Create guest</button></div>
    </form>`);
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBackdrop.querySelector("input")?.focus();
}
function saveNewReservation(form, formElement = null) {
  const guestMode = String(form.get("guestMode") || "existing");
  const propertyId = String(form.get("propertyId") || "");
  const unitId = String(form.get("unitId") || "");
  const primaryGuestIdFromForm = String(form.get("primaryGuestId") || "");
  const source = String(form.get("source") || "direct");
  const checkIn = String(form.get("checkin") || "");
  const checkOut = String(form.get("checkout") || "");
  const unit = getUnitById(unitId);
  const property = getPropertyById(propertyId);
  const adults = Number(form.get("adults") || 0);
  const children = Number(form.get("children") || 0);
  const infants = Number(form.get("infants") || 0);
  const money = readMoneyFields(form, reservationMoneyFieldNames());
  const dateError = validateReservationDates(checkIn, checkOut);
  if (dateError) {
    showToast(dateError);
    return false;
  }
  if (!property || !unit || unit.propertyId !== property.id) {
    showToast("Selected unit does not belong to the selected property");
    return false;
  }
  const capacityError = validateReservationCapacity(adults, children, unit);
  if (capacityError) {
    showToast(capacityError);
    return false;
  }
  if (money.invalidFields.length) {
    showToast("Financial fields must contain non-negative numbers");
    return false;
  }
  const moneyError = validateReservationMoney(money.values);
  if (moneyError) {
    showToast(moneyError);
    return false;
  }
  if (!isUnitAvailable(unit.id, checkIn, checkOut)) {
    showToast(`Reservation conflict. ${unitAvailabilityLabel(unit.id)} is unavailable from ${formatLongDate(checkIn)} to ${formatLongDate(checkOut)}.`);
    return false;
  }
  let resolvedPrimaryGuestId = primaryGuestIdFromForm || String(form.get("duplicateGuestId") || "");
  if (guestMode === "new") {
    const firstName = String(form.get("newFirstName") || "").trim();
    const lastName = String(form.get("newLastName") || "").trim();
    const email = String(form.get("newEmail") || "").trim();
    const phone = String(form.get("newPhone") || "").trim();
    const country = String(form.get("newCountry") || "").trim();
    if (!firstName) {
      showToast("First name is required for a new guest");
      return false;
    }
    const duplicates = guestDuplicateMatches(email, phone);
    const duplicateDecision = String(form.get("duplicateDecision") || "");
    if (duplicates.length && !duplicateDecision) {
      showDuplicateGuestWarning(formElement, duplicates);
      showToast("Possible duplicate guest found");
      return false;
    }
    if (duplicates.length && duplicateDecision === "use-existing") {
      resolvedPrimaryGuestId = duplicates[0].id;
    } else {
      resolvedPrimaryGuestId = createId("guest");
      const now = new Date().toISOString();
      guests.push({
        id: resolvedPrimaryGuestId,
        workspaceId: workspace.id,
        firstName,
        lastName,
        email,
        phone,
        country,
        language: language,
        dateOfBirth: null,
        vipStatus: false,
        notes: "",
        initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(),
        avatar: "avatar-sage",
        tier: "",
        createdAt: now,
        updatedAt: now
      });
    }
  }
  if (!resolvedPrimaryGuestId || !getGuestById(resolvedPrimaryGuestId)) {
    showToast("Please select an existing guest or create a new guest");
    return false;
  }
  const referenceError = validateReservationReferences(unitId, resolvedPrimaryGuestId, propertyId);
  if (referenceError) {
    showToast(referenceError);
    return false;
  }
  const reservationStatus = normalizeStatus(form.get("status")) || "PENDING";
  if (!["INQUIRY", "PENDING", "CONFIRMED"].includes(reservationStatus)) {
    showToast("Initial reservation status is invalid");
    return false;
  }
  const now = new Date().toISOString();
  const reservationIdentity = nextReservationId();
  const newReservation = {
    id: reservationIdentity.id,
    reference: reservationIdentity.reference,
    workspaceId: workspace.id,
    propertyId,
    unitId: unit.id,
    primaryGuestId: resolvedPrimaryGuestId,
    // Legacy guestId is intentionally mirrored during migration only.
    guestId: resolvedPrimaryGuestId,
    checkIn,
    checkOut,
    adults,
    children,
    infants,
    source,
    channelId: `channel_${source}`,
    externalReservationId: String(form.get("externalReservationId") || "").trim() || null,
    status: reservationStatus,
    paymentStatus: normalizePaymentStatus(form.get("paymentStatus")),
    accommodationRevenue: money.values.accommodationRevenue,
    // Legacy roomRevenue is intentionally mirrored during migration only.
    roomRevenue: money.values.accommodationRevenue,
    cleaningFee: money.values.cleaningFee,
    taxes: money.values.taxes,
    extras: money.values.extras,
    discounts: money.values.discounts,
    otaCommission: money.values.otaCommission,
    paymentProcessingFee: money.values.paymentProcessingFee,
    currency: workspace.currency,
    internalNotes: String(form.get("internalNotes") || "").trim(),
    guestNotes: String(form.get("guestNotes") || "").trim(),
    estimatedArrivalTime: String(form.get("estimatedArrivalTime") || "").trim(),
    createdAt: now,
    updatedAt: now,
    createdBy: users[0]?.id || null
  };
  if (!isReservationIntegrityValid(newReservation)) {
    showToast("Reservation references are invalid");
    return false;
  }
  reservations.unshift(newReservation);
  saveCollection("arsavaya-reservations", reservations);
  saveCollection("arsavaya-guests", guests);
  closeModal();
  showToast("Reservation created");
  renderPage(activePage);
  return true;
}
function saveEditedReservation(form) {
  const reservation = findReservation(form.get("reservationId"));
  if (!reservation) {
    showToast("Reservation was not found");
    return false;
  }
  const unitId = String(form.get("unitId") || "");
  const primaryGuestId = String(form.get("primaryGuestId") || "");
  const checkIn = String(form.get("checkin") || "");
  const checkOut = String(form.get("checkout") || "");
  const propertyId = String(form.get("propertyId") || "");
  const adults = Number(form.get("adults") || 0);
  const children = Number(form.get("children") || 0);
  const dateError = validateReservationDates(checkIn, checkOut);
  const referenceError = validateReservationReferences(unitId, primaryGuestId, propertyId);
  const unit = getUnitById(unitId);
  const money = readMoneyFields(form, reservationMoneyFieldNames());
  if (dateError) {
    showToast(dateError);
    return false;
  }
  if (referenceError) {
    showToast(referenceError);
    return false;
  }
  const capacityError = validateReservationCapacity(adults, children, unit);
  if (capacityError) {
    showToast(capacityError);
    return false;
  }
  if (money.invalidFields.length) {
    showToast("Financial fields must contain non-negative numbers");
    return false;
  }
  const moneyError = validateReservationMoney(money.values);
  if (moneyError) {
    showToast(moneyError);
    return false;
  }
  if (!isUnitAvailable(unitId, checkIn, checkOut, reservation.id)) {
    const unit = getUnitById(unitId);
    showToast(`Reservation conflict. ${unitAvailabilityLabel(unitId)} is unavailable from ${formatLongDate(checkIn)} to ${formatLongDate(checkOut)}.`);
    return false;
  }
  const nextStatus = normalizeStatus(form.get("status")) || reservation.status;
  if (!canTransitionReservation(reservation, nextStatus)) {
    showToast(`Cannot move ${reservation.reference} from ${titleCaseEnum(reservation.status)} to ${titleCaseEnum(nextStatus)}`);
    return false;
  }
  if (nextStatus === "CANCELLED" && reservation.status !== "CANCELLED" && !window.confirm(`Cancel reservation ${reservation.reference}?`)) return false;
  reservation.propertyId = unit.propertyId;
  reservation.unitId = unitId;
  reservation.primaryGuestId = primaryGuestId;
  // Keep legacy relation synchronized until the migration window closes.
  reservation.guestId = primaryGuestId;
  reservation.checkIn = checkIn;
  reservation.checkOut = checkOut;
  reservation.adults = adults;
  reservation.children = children;
  reservation.infants = Math.max(0, Number(form.get("infants") || 0));
  reservation.source = String(form.get("source") || "direct");
  reservation.channelId = `channel_${reservation.source}`;
  reservation.externalReservationId = String(form.get("externalReservationId") || "").trim() || null;
  reservation.status = nextStatus;
  reservation.paymentStatus = normalizePaymentStatus(form.get("paymentStatus"));
  reservation.accommodationRevenue = money.values.accommodationRevenue;
  // Keep legacy revenue synchronized until the migration window closes.
  reservation.roomRevenue = reservation.accommodationRevenue;
  reservation.cleaningFee = money.values.cleaningFee;
  reservation.taxes = money.values.taxes;
  reservation.extras = money.values.extras;
  reservation.discounts = money.values.discounts;
  reservation.otaCommission = money.values.otaCommission;
  reservation.paymentProcessingFee = money.values.paymentProcessingFee;
  reservation.internalNotes = String(form.get("internalNotes") || "").trim();
  reservation.guestNotes = String(form.get("guestNotes") || "").trim();
  reservation.estimatedArrivalTime = String(form.get("estimatedArrivalTime") || "").trim();
  reservation.updatedAt = new Date().toISOString();
  if (!isReservationIntegrityValid(reservation)) {
    showToast("Reservation references are invalid");
    return false;
  }
  if (nextStatus === "CHECKED_OUT") createCheckoutTasks(reservation);
  saveCollection("arsavaya-reservations", reservations);
  closeModal();
  closeDrawer();
  renderPage(activePage);
  showToast(`${reservation.reference} updated`);
  return true;
}
function handleEntityFormSubmit(event) {
  const form = event.target;
  if (!form.matches("[data-entity-form]")) return;
  event.preventDefault();
  const data = new FormData(form);
  const entity = form.dataset.entityForm;
  if (entity === "reservation") {
    saveNewReservation(data, form);
    return;
  }
  if (entity === "reservation-edit") {
    saveEditedReservation(data);
    return;
  }
  if (entity === "calendar-block") {
    saveCalendarBlock(data);
    return;
  }
  const now = new Date().toISOString();
  if (entity === "owner") {
    const ownerCode = String(data.get("ownerCode") || `OWN-${String(owners.length + 1).padStart(3, "0")}`).trim();
    owners.push({ id: createId("owner"), workspaceId: workspace.id, ownerCode, name: String(data.get("name") || "").trim(), email: String(data.get("email") || "").trim(), phone: String(data.get("phone") || "").trim(), address: String(data.get("address") || "").trim(), bankDetails: "", taxInfo: "", notes: "", status: String(data.get("status") || "ACTIVE"), createdAt: now, updatedAt: now });
    saveCollection("arsavaya-owners", owners);
    closeModal();
    showToast("Owner created");
    renderPage(activePage);
    return;
  }
  if (entity === "property") {
    const propertyId = createId("property");
    const propertyType = String(data.get("propertyType") || "STANDALONE");
    const propertyName = String(data.get("name") || "").trim();
    properties.push({ id: propertyId, workspaceId: workspace.id, ownerId: String(data.get("ownerId") || ""), code: String(data.get("code") || "").trim(), name: propertyName, address: String(data.get("location") || "").trim(), location: String(data.get("location") || "").trim(), propertyType, type: propertyType === "COMPLEX" ? "complex" : "standalone", timezone: workspace.timezone, status: "ACTIVE", latitude: null, longitude: null, notes: "", image: propertyImageData(propertyName || "New property"), next: "New property" });
    const unitId = createId("unit");
    units.push({ id: unitId, workspaceId: workspace.id, propertyId, code: propertyType === "COMPLEX" ? "UNIT-01" : "ENTIRE-VILLA", name: String(data.get("unitName") || "Entire Villa").trim(), inventoryType: propertyType === "COMPLEX" ? "PRIVATE_UNIT" : "ENTIRE_VILLA", bedrooms: 1, bathrooms: 1, maxGuests: 2, baseRate: 0, checkInTime: settings.defaultCheckInTime, checkOutTime: settings.defaultCheckOutTime, status: "ACTIVE", housekeepingStatus: "READY" });
    saveCollection("arsavaya-properties", properties);
    saveCollection("arsavaya-units", units);
    closeModal();
    showToast("Property and first unit created");
    renderPage(activePage);
    return;
  }
  if (entity === "unit") {
    const propertyId = String(data.get("propertyId") || "");
    units.push({ id: createId("unit"), workspaceId: workspace.id, propertyId, code: String(data.get("code") || "").trim(), name: String(data.get("name") || "").trim(), inventoryType: "PRIVATE_UNIT", bedrooms: Math.max(0, Number(data.get("bedrooms") || 0)), bathrooms: 1, maxGuests: Math.max(1, Number(data.get("maxGuests") || 2)), baseRate: Math.max(0, Number(data.get("baseRate") || 0)), checkInTime: settings.defaultCheckInTime, checkOutTime: settings.defaultCheckOutTime, status: String(data.get("status") || "ACTIVE"), housekeepingStatus: "READY" });
    saveCollection("arsavaya-units", units);
    closeModal();
    showToast("Unit created");
    renderPage(activePage);
    return;
  }
  if (entity === "guest") {
    const firstName = String(data.get("firstName") || "").trim();
    const lastName = String(data.get("lastName") || "").trim();
    const guest = { id: createId("guest"), workspaceId: workspace.id, firstName, lastName, email: String(data.get("email") || "").trim(), phone: String(data.get("phone") || "").trim(), country: String(data.get("country") || "").trim(), language: String(data.get("language") || "en"), dateOfBirth: null, vipStatus: false, notes: "", initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(), avatar: "avatar-sage", tier: "" };
    guests.push(guest);
    saveCollection("arsavaya-guests", guests);
    closeModal();
    showToast("Guest created");
    renderPage(activePage);
  }
}
function saveCalendarBlock(form) {
  const propertyId = String(form.get("propertyId") || "");
  const unitId = String(form.get("unitId") || "");
  const type = normalizeStatus(form.get("type"));
  const startDate = String(form.get("startDate") || "");
  const endDate = String(form.get("endDate") || "");
  const property = getPropertyById(propertyId);
  const unit = getUnitById(unitId);
  if (!property || !unit || unit.propertyId !== property.id || !isSellableUnit(unit)) {
    showToast("Selected unit does not belong to the selected property");
    return false;
  }
  if (!calendarBlockTypes.has(type)) {
    showToast("Please select a valid block type");
    return false;
  }
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate <= startDate) {
    showToast("Block end date must be after the start date");
    return false;
  }
  const conflicts = getConflicts(unitId, startDate, endDate);
  if (conflicts.length) {
    const first = conflicts[0];
    const label = first.type === "RESERVATION" ? first.record.reference : calendarBlockTypeLabels[normalizeStatus(first.record.type)] || "calendar block";
    showToast(`Availability conflict with ${label} from ${formatLongDate(startDate)} to ${formatLongDate(endDate)}.`);
    return false;
  }
  const now = new Date().toISOString();
  blocks.push({
    id: createId("block"),
    workspaceId: workspace.id,
    propertyId,
    unitId,
    type,
    startDate,
    endDate,
    reason: String(form.get("reason") || "").trim(),
    notes: String(form.get("notes") || "").trim(),
    createdBy: users[0]?.id || null,
    createdAt: now
  });
  saveCollection("arsavaya-blocks", blocks);
  closeModal();
  renderPage("calendar");
  showToast("Calendar block created");
  return true;
}
function removeCalendarBlock(blockId) {
  const index = blocks.findIndex(block => block.id === blockId);
  if (index < 0) return false;
  const block = blocks[index];
  if (!window.confirm(`Remove ${calendarBlockTypeLabels[normalizeStatus(block.type)] || "calendar block"} for ${formatLongDate(block.startDate)} to ${formatLongDate(block.endDate)}?`)) return false;
  blocks.splice(index, 1);
  saveCollection("arsavaya-blocks", blocks);
  closeDrawer();
  renderPage("calendar");
  showToast("Calendar block removed");
  return true;
}
function handleMessageSubmit(event) {
  const form = event.target;
  if (form.id !== "messageForm") return;
  event.preventDefault();
  const input = form.querySelector("#messageInput");
  const body = String(input?.value || "").trim();
  if (!body) return;
  const thread = threads[activeThread];
  if (!thread) return;
  messages.push({
    id: createId("message"),
    workspaceId: workspace.id,
    threadId: thread.id,
    direction: "OUTBOUND",
    body,
    sentAt: new Date().toISOString(),
    senderId: users[0]?.id || null,
    deliveryStatus: "SENT"
  });
  thread.preview = body;
  thread.time = "Now";
  thread.unread = false;
  saveCollection("arsavaya-messages", messages);
  saveCollection("arsavaya-threads", threads);
  renderPage("inbox");
  showToast("Reply sent to " + thread.name);
}

function renderDashboard() {
  const metrics = portfolioMetrics();
  const upcomingReservations = reservations
    .filter(reservation => isActiveReservation(reservation) && reservation.checkIn >= todayIso())
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const reservationsHtml = reservations
    .filter(isActiveReservation)
    .slice(0, 4)
    .map(row => `
    <tr>
      ${(() => { const view = reservationView(row); return `<td><div class="guest-cell">${avatar(view.guest?.initials || "??", view.guest?.avatar)}<span>${view.guestName}</span></div></td><td>${view.propertyCode}</td><td>${view.dates}</td><td><span class="source"><span class="source-mark ${sourceClass(view.sourceLabel)}"></span>${view.sourceLabel}</span></td><td><span class="status ${view.statusClass}">${view.statusLabel}</span></td><td class="amount">${formatCurrency(view.total)}</td>`; })()}
    </tr>`).join("");
  const messagesHtml = threads.slice(0, 3).map(thread => `<button class="message-item" data-page="inbox"><div>${avatar(thread.initials, thread.avatar)}</div><div class="message-copy"><div class="message-line"><span>${thread.name}</span><time>${thread.time}</time></div><p>${thread.preview}</p></div>${thread.unread ? '<span class="unread-dot"></span>' : ""}</button>`).join("");
  const operations = tasks
    .filter(task => String(task.due || "").startsWith(todayIso()))
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 4);
  const operationRows = operations.length ? operations.map(task => {
    const unit = getUnitById(task.unitId);
    const property = getPropertyById(unit?.propertyId);
    const relatedReservation = reservations.find(reservation =>
      reservationUnitId(reservation) === task.unitId &&
      isActiveReservation(reservation) &&
      (reservation.checkIn === todayIso() || reservation.checkOut === todayIso())
    );
    const guest = relatedReservation ? reservationView(relatedReservation).guestName : "—";
    return `<tr><td>${formatTaskDue(task.due).split(", ").pop()}</td><td>${property?.code || "—"}</td><td>${escapeHtml(task.task)}</td><td>${escapeHtml(guest)}</td><td><span class="status ${taskStatusClass(task)}">${titleCaseEnum(task.status)}</span></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty-state">No operations scheduled today.</td></tr>`;
  const unreadMessages = threads.filter(thread => thread.unread).length;
  const paymentPending = reservations.filter(reservation => isActiveReservation(reservation) && ["UNPAID", "PARTIAL"].includes(normalizeStatus(reservation.paymentStatus))).length;
  const maintenanceOpen = tasks.filter(task => normalizeStatus(task.category) === "MAINTENANCE" && normalizeStatus(task.status) !== "COMPLETED").length;
  const awaitingConfirmation = reservations.filter(reservation => normalizeStatus(reservation.status) === "PENDING").length;
  return `
    ${pageHeading({ ...pageMeta.dashboard, eyebrow: applicationDateLabel() }, "Good afternoon, Nyoman.", "Here is what is happening with your properties today.", `<button class="button button-secondary date-filter">${icon("calendar-days")} ${formatLongDate(todayIso())} ${icon("chevron-down")}</button>`)}
    <section class="metrics-grid">
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Properties</span><span class="metric-icon gold">${icon("home")}</span></div><div class="metric-value">${metrics.totalProperties}</div><div class="metric-foot"><span>${metrics.totalUnits} sellable units</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Occupied units</span><span class="metric-icon green">${icon("bed-double")}</span></div><div class="metric-value">${metrics.occupied}</div><div class="metric-foot"><span>${metrics.occupancyRate}% occupancy</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Available units</span><span class="metric-icon blue">${icon("bed-single")}</span></div><div class="metric-value">${metrics.available}</div><div class="metric-foot"><span>${100 - metrics.occupancyRate}% available</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Check-ins today</span><span class="metric-icon green">${icon("log-in")}</span></div><div class="metric-value">${metrics.arrivalsToday}</div><div class="metric-foot"><span>Arrivals today</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Check-outs today</span><span class="metric-icon gold">${icon("log-out")}</span></div><div class="metric-value">${metrics.departuresToday}</div><div class="metric-foot"><span>Departures today</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">In-house guests</span><span class="metric-icon green">${icon("users")}</span></div><div class="metric-value">${metrics.inHouseGuests}</div><div class="metric-foot"><span>Across ${metrics.occupied} units</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Revenue this month</span><span class="metric-icon coral">${icon("bar-chart-3")}</span></div><div class="metric-value metric-value-small">${formatCurrency(metrics.revenue)}</div><div class="metric-foot"><span class="trend-up">Net</span><span>after OTA commission</span></div></article>
      <article class="metric-card"><div class="metric-top"><span class="metric-label">Average guest rating</span><span class="metric-icon gold">${icon("star")}</span></div><div class="metric-value">4.8</div><div class="metric-foot"><span>(32 reviews)</span></div></article>
    </section>
    <section class="dashboard-grid">
      <article class="surface operations-surface"><div class="surface-header"><div><h2 class="surface-title">Today's Operations</h2><p class="surface-subtitle">Arrivals, departures, and villa readiness.</p></div><button class="text-button" data-page="tasks">View all ${icon("arrow-up-right")}</button></div><div class="table-wrap"><table><thead><tr><th>Time</th><th>Property</th><th>Activity</th><th>Guest</th><th>Status</th></tr></thead><tbody>${operationRows}</tbody></table></div></article>
      <article class="surface upcoming-surface"><div class="surface-header"><div><h2 class="surface-title">Upcoming Reservations</h2><p class="surface-subtitle">The next arrivals across your villas.</p></div><button class="text-button" data-page="reservations">View all ${icon("arrow-up-right")}</button></div><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Property</th><th>Check-in</th><th>Nights</th></tr></thead><tbody>
      ${upcomingReservations.slice(0, 4).map(reservation => { const view = reservationView(reservation); return `<tr><td>${view.guestName}</td><td>${view.propertyCode}</td><td>${formatLongDate(reservation.checkIn)}</td><td>${view.nights}</td></tr>`; }).join("")}
      </tbody></table></div></article>
    </section>
    <section class="quick-stats"><div class="quick-stat"><span class="quick-stat-icon coral">${icon("mail")}</span><div><strong>${unreadMessages}</strong><span>Unread guest messages</span></div></div><div class="quick-stat"><span class="quick-stat-icon green">${icon("credit-card")}</span><div><strong>${paymentPending}</strong><span>Payment pending</span></div></div><div class="quick-stat"><span class="quick-stat-icon gold">${icon("wrench")}</span><div><strong>${maintenanceOpen}</strong><span>Maintenance issue</span></div></div><div class="quick-stat"><span class="quick-stat-icon coral">${icon("circle-alert")}</span><div><strong>${awaitingConfirmation}</strong><span>Reservation awaiting confirmation</span></div></div></section>
    <section class="lower-grid">
      <article class="surface"><div class="surface-header"><div><h2 class="surface-title">Recent reservations</h2><p class="surface-subtitle">The latest booking activity.</p></div><button class="text-button" data-page="reservations">View all ${icon("arrow-up-right")}</button></div><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Property</th><th>Stay</th><th>Source</th><th>Status</th><th>Total</th></tr></thead><tbody>${reservationsHtml}</tbody></table></div></article>
      <article class="surface inbox-preview"><div class="surface-header"><div><h2 class="surface-title">Inbox</h2><p class="surface-subtitle">Recent guest conversations</p></div><button class="text-button" data-page="inbox">Open inbox ${icon("arrow-up-right")}</button></div><div class="message-list">${messagesHtml}</div></article>
    </section>`;
}

function renderReservations() {
  const filteredReservations = reservations.filter(row => {
    const view = reservationView(row);
    const matchesSearch = !reservationSearch || `${row.reference} ${row.id} ${row.externalReservationId || ""} ${view.guestName} ${view.propertyName} ${view.propertyCode} ${view.unitName} ${view.unitCode} ${view.sourceLabel}`.toLowerCase().includes(reservationSearch.toLowerCase());
    const matchesSource = reservationSource === "all" || row.source === reservationSource;
    const matchesFilter = reservationFilter === "all" || (reservationFilter === "pending" && normalizeStatus(row.status) === "PENDING") || (reservationFilter === "arrivals" && row.checkIn === todayIso());
    return matchesSearch && matchesSource && matchesFilter;
  });
  const rows = filteredReservations.map(row => {
    const view = reservationView(row);
    return `<tr class="clickable-row" data-reservation="${row.id}">
      <td><span class="guest-meta">${view.reference}</span></td>
      <td><div class="guest-cell">${avatar(view.guest?.initials || "??", view.guest?.avatar)}<span>${view.guestName}</span></div></td>
      <td><div class="property-cell"><img class="property-thumb" src="${view.property?.image || ""}" alt="" /><span>${view.propertyCode}<small>${view.unitCode} · ${view.unitName}</small></span></div></td>
      <td>${view.dates}<br><span class="guest-meta">${view.nights} nights</span></td>
      <td><span class="source"><span class="source-mark ${sourceClass(view.sourceLabel)}"></span>${view.sourceLabel}</span></td>
      <td><span class="status ${view.statusClass}">${view.statusLabel}</span></td>
      <td class="amount">${formatCurrency(view.total)}</td>
    </tr>`;
  }).join("");
  return `${pageHeading(pageMeta.reservations, "Reservations", "A single source of truth for every stay, arrival, and booking value.", addReservationButton())}
    <div class="page-toolbar"><div class="filter-group"><button class="filter-chip ${reservationFilter === "all" ? "active" : ""}" data-res-filter="all">All reservations <span>${reservations.length}</span></button><button class="filter-chip ${reservationFilter === "arrivals" ? "active" : ""}" data-res-filter="arrivals">Arriving today <span>${reservations.filter(row => isActiveReservation(row) && row.checkIn === todayIso()).length}</span></button><button class="filter-chip ${reservationFilter === "pending" ? "active" : ""}" data-res-filter="pending">Needs attention <span>${reservations.filter(row => normalizeStatus(row.status) === "PENDING").length}</span></button></div><div class="filter-group"><select class="select-control" id="reservationSource"><option value="all" ${reservationSource === "all" ? "selected" : ""}>All sources</option><option value="direct" ${reservationSource === "direct" ? "selected" : ""}>Direct</option><option value="airbnb" ${reservationSource === "airbnb" ? "selected" : ""}>Airbnb</option><option value="booking_com" ${reservationSource === "booking_com" ? "selected" : ""}>Booking.com</option></select><button class="icon-button" aria-label="Export reservations" data-action="export">${icon("download")}</button></div></div>
    <div class="inline-search"><i data-lucide="search"></i><input id="reservationSearch" value="${reservationSearch}" placeholder="Search by guest, reservation ID, or property..." /></div>
    <article class="surface data-surface"><div class="table-wrap"><table class="data-table"><thead><tr><th>Reference</th><th>Guest</th><th>Property</th><th>Stay dates</th><th>Source</th><th>Status</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty-state">No reservations match this view.</td></tr>'}</tbody></table></div><div class="pagination"><span>Showing ${filteredReservations.length} of ${reservations.length} reservations</span><div class="pagination-actions"><button aria-label="Previous" data-action="previous-page">${icon("chevron-left")}</button><button aria-label="Next" data-action="next-page">${icon("chevron-right")}</button></div></div></article>`;
}

function renderProperties() {
  let visibleProperties = properties.filter(property => propertyFilter === "all" || propertyOperationalStatus(property) === propertyFilter);
  visibleProperties = visibleProperties.map(property => ({ ...property, ...propertyMetrics(property.id) }));
  visibleProperties = [...visibleProperties].sort((a, b) => propertySort === "revenue" ? b.revenue - a.revenue : propertySort === "name" ? a.name.localeCompare(b.name) : b.occupancy - a.occupancy);
  const propertyCounts = {
    all: properties.length,
    occupied: properties.filter(property => propertyOperationalStatus(property) === "occupied").length,
    available: properties.filter(property => propertyOperationalStatus(property) === "available").length,
    maintenance: properties.filter(property => propertyOperationalStatus(property) === "maintenance").length
  };
  const cards = visibleProperties.map(property => {
    const [label] = statusForProperty(propertyOperationalStatus(property));
    return `<article class="property-card clickable-card" data-property="${property.id}"><div class="property-image-wrap"><img class="property-image" src="${property.image}" alt="${property.name}" /><span class="property-state">${label}</span></div><div class="property-body"><div class="property-title"><div><h3>${property.code}</h3><strong class="property-name">${property.name}</strong><div class="property-location">${icon("map-pin")} ${property.location}</div></div><button aria-label="More property actions" data-property-action="${property.id}">${icon("more-horizontal")}</button></div><div class="property-stats"><div class="property-stat"><span>Occupancy</span><strong>${property.occupancy}%</strong></div><div class="property-stat"><span>Inventory</span><strong>${propertyUnitSummary(property.id)}</strong></div><div class="property-stat"><span>Month to date</span><strong>${formatCurrency(property.revenue)}</strong></div></div><div class="occupancy-line"><span style="width:${property.occupancy}%"></span></div></div></article>`;
  }).join("");
  return `${pageHeading(pageMeta.properties, "Your properties", "Keep every villa, its availability, and operating context in view.", `<button class="button button-secondary" data-action="property-export">${icon("download")} Export list</button><button class="button button-primary" data-action="add-property">${icon("plus")} Add property</button>`)}
    <div class="page-toolbar"><div class="filter-group"><button class="filter-chip ${propertyFilter === "all" ? "active" : ""}" data-property-filter="all">All villas <span>${propertyCounts.all}</span></button><button class="filter-chip ${propertyFilter === "occupied" ? "active" : ""}" data-property-filter="occupied">Occupied <span>${propertyCounts.occupied}</span></button><button class="filter-chip ${propertyFilter === "available" ? "active" : ""}" data-property-filter="available">Available <span>${propertyCounts.available}</span></button><button class="filter-chip ${propertyFilter === "maintenance" ? "active" : ""}" data-property-filter="maintenance">Maintenance <span>${propertyCounts.maintenance}</span></button></div><select class="select-control" id="propertySort"><option value="occupancy" ${propertySort === "occupancy" ? "selected" : ""}>Sort by occupancy</option><option value="revenue" ${propertySort === "revenue" ? "selected" : ""}>Sort by revenue</option><option value="name" ${propertySort === "name" ? "selected" : ""}>Sort by name</option></select></div>
    <section class="property-grid">${cards}</section>`;
}

function renderGuests() {
  const visibleGuests = guests.filter(guest => {
    const stayInfo = guestLatestStay(guest.id);
    const matchesSearch = !guestSearch || `${guestDisplayName(guest)} ${guest.email} ${guest.phone} ${guest.country} ${stayInfo.stay}`.toLowerCase().includes(guestSearch.toLowerCase());
    const matchesFilter = guestFilter === "all" || (guestFilter === "vip" && guest.vipStatus) || (guestFilter === "returning" && guest.tier === "Returning guest");
    return matchesSearch && matchesFilter;
  });
  const returningRate = guests.length ? Math.round((guests.filter(guest => guest.tier === "Returning guest").length / guests.length) * 100) : 0;
  const countryCount = new Set(guests.map(guest => guest.country).filter(Boolean)).size;
  const rows = visibleGuests.map(guest => { const stayInfo = guestLatestStay(guest.id); return `<tr class="clickable-row" data-guest="${guest.id}"><td><div class="guest-cell">${avatar(guest.initials, guest.avatar)}<div><div class="guest-name">${guestDisplayName(guest)}</div><div class="guest-meta">${guest.email || guest.phone || "No contact details"}</div></div></div></td><td>${guest.country}</td><td>${stayInfo.stay}</td><td>${stayInfo.last}</td><td>${guest.tier ? `<span class="tag">${guest.tier}</span>` : '<span class="guest-meta">—</span>'}</td><td><button class="icon-button" aria-label="Open guest">${icon("arrow-up-right")}</button></td></tr>`; }).join("");
  return `${pageHeading(pageMeta.guests, "Guests", "Know who is staying with you, what they need, and how to welcome them back.", `<button class="button button-secondary" data-action="guest-export">${icon("download")} Export guests</button><button class="button button-primary" data-action="add-guest">${icon("user-plus")} Add guest</button>`)}
    <section class="guest-summary"><div class="summary-strip">${icon("users")}<div><strong>${guests.length}</strong><span>Total guests</span></div></div><div class="summary-strip">${icon("repeat-2")}<div><strong>${returningRate}%</strong><span>Returning guests</span></div></div><div class="summary-strip">${icon("globe-2")}<div><strong>${countryCount}</strong><span>Countries represented</span></div></div></section>
    <div class="page-toolbar"><div class="filter-group"><button class="filter-chip ${guestFilter === "all" ? "active" : ""}" data-guest-filter="all">All guests</button><button class="filter-chip ${guestFilter === "vip" ? "active" : ""}" data-guest-filter="vip">VIP guests</button><button class="filter-chip ${guestFilter === "returning" ? "active" : ""}" data-guest-filter="returning">Returning guests</button></div><div class="inline-search compact-search"><i data-lucide="search"></i><input id="guestSearch" value="${guestSearch}" placeholder="Search guests..." /></div></div>
    <article class="surface data-surface"><div class="table-wrap"><table class="data-table"><thead><tr><th>Guest</th><th>Country</th><th>Latest stay</th><th>Last contact</th><th>Profile</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty-state">No guests match this view.</td></tr>'}</tbody></table></div><div class="pagination"><span>Showing ${visibleGuests.length} of ${guests.length} guests</span><div class="pagination-actions"><button aria-label="Previous" data-action="previous-page">${icon("chevron-left")}</button><button aria-label="Next" data-action="next-page">${icon("chevron-right")}</button></div></div></article>`;
}

function renderOwners() {
  const rows = owners.map(owner => {
    const linkedProperties = ownerProperties(owner.id);
    const linkedUnits = linkedProperties.flatMap(property => getUnitsByPropertyId(property.id));
    const revenue = reservations
      .filter(isActiveReservation)
      .filter(reservation => linkedUnits.some(unit => unit.id === reservation.unitId))
      .reduce((total, reservation) => total + reservationNetRevenue(reservation), 0);
    const primaryAgreement = linkedProperties.map(property => managementAgreementForProperty(property.id)).find(Boolean);
    return `<tr class="clickable-row" data-owner="${owner.id}">
      <td><div class="guest-cell">${avatar(owner.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), "avatar-amber")}<div><div class="guest-name">${escapeHtml(owner.name)}</div><div class="guest-meta">${escapeHtml(owner.ownerCode)}</div></div></div></td>
      <td>${escapeHtml(owner.email || owner.phone || "No contact")}</td>
      <td>${linkedProperties.length} properties<br><span class="guest-meta">${linkedUnits.length} sellable units</span></td>
      <td>${escapeHtml(primaryAgreement?.packageName || "No active agreement")}</td>
      <td>${primaryAgreement ? `${primaryAgreement.managementFeeValue}%` : "-"}</td>
      <td><span class="status ${normalizeStatus(owner.status) === "ACTIVE" ? "confirmed" : "pending"}">${titleCaseEnum(owner.status)}</span></td>
      <td class="amount">${formatCurrency(revenue)}</td>
    </tr>`;
  }).join("");
  return `${pageHeading(pageMeta.owners, "Owners", "Manage owner records, linked villas, agreements, and future portal access from one place.", `<button class="button button-primary" data-action="add-owner">${icon("plus")} Add owner</button>`)}
    <article class="surface data-surface"><div class="table-wrap"><table class="data-table"><thead><tr><th>Owner</th><th>Contact</th><th>Portfolio</th><th>Agreement</th><th>Fee</th><th>Status</th><th>Net revenue</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty-state">No owners yet.</td></tr>'}</tbody></table></div></article>`;
}

function renderCalendar() {
  const shiftedDays = calendarDaysForView();
  const miniDays = miniCalendarDays();
  const header = `<div class="cal-corner">Unit / date</div>${shiftedDays.map(day => `<div class="cal-day ${day.today ? "today" : ""}"><span>${day.day}</span><strong>${day.date}</strong></div>`).join("")}`;
  let grid = header;
  properties.forEach(property => {
    getUnitsByPropertyId(property.id).forEach(unit => {
      const events = calendarEventsForUnit(unit.id, shiftedDays);
      grid += `<div class="cal-property"><strong>${property.code} · ${unit.code}</strong><span>${property.name} · ${unit.name}</span></div>`;
      shiftedDays.forEach((_, dayIndex) => {
        const event = events.find(item => item.start === dayIndex);
        const eventMarkup = event ? `<div class="reservation-bar ${event.cls} ${event.start === 0 ? "continued-left" : ""} ${event.start + event.span === shiftedDays.length ? "continued-right" : ""}" ${event.kind === "reservation" ? `data-reservation="${event.reservation.id}"` : `data-block="${event.block.id}"`} style="width:calc(${event.span * 100}% + ${(event.span - 1) * 1}px)">${escapeHtml(event.text)}</div>` : "";
        grid += `<div class="cal-slot">${eventMarkup}</div>`;
      });
    });
  });
  const rangeStart = formatLongDate(shiftedDays[0].iso);
  const rangeEnd = formatLongDate(shiftedDays[shiftedDays.length - 1].iso);
  const miniMonthLabel = applicationMonthLabel(parseDate(todayIso()));
  return `${pageHeading(pageMeta.calendar, "Portfolio calendar", "A live view of availability across every villa, with arrivals, departures, and blocked dates at a glance.", `<button class="button button-secondary" data-action="create-calendar-block">${icon("lock-keyhole")} Block dates</button><button class="button button-primary" data-open-modal>${icon("plus")} Add reservation</button>`)}
    <div class="calendar-layout"><aside class="surface mini-calendar"><div class="mini-calendar-header"><button data-calendar-nav="-1">${icon("chevron-left")}</button><strong>${miniMonthLabel}</strong><button data-calendar-nav="1">${icon("chevron-right")}</button></div><div class="mini-weekdays">${["S","M","T","W","T","F","S"].map(day => `<span>${day}</span>`).join("")}</div><div class="mini-days">${miniDays.map(day => `<button data-calendar-day="${day.iso}" class="${day.muted ? "muted" : ""} ${day.today ? "today" : ""}">${day.day}</button>`).join("")}</div><div class="legend-panel"><h3>Calendar events</h3><div class="legend-row"><i class="legend-pill coral"></i>Airbnb</div><div class="legend-row"><i class="legend-pill blue"></i>Booking.com</div><div class="legend-row"><i class="legend-pill"></i>Direct</div><div class="legend-row"><i class="legend-pill gold"></i>Owner stay</div><div class="legend-row"><i class="legend-pill gray"></i>Maintenance / blocked</div></div></aside><article class="surface calendar-surface"><div class="calendar-header"><div class="calendar-month"><div class="calendar-nav"><button data-calendar-nav="-1">${icon("chevron-left")}</button><button data-calendar-nav="1">${icon("chevron-right")}</button></div><h2>${rangeStart} — ${rangeEnd}</h2></div><div class="view-toggle">${["Week", "Month", "Day"].map(view => `<button class="${calendarView === view ? "active" : ""}" data-calendar-view="${view}" ${view !== "Week" ? "disabled title=\"Coming soon\"" : ""}>${view}${view !== "Week" ? " · soon" : ""}</button>`).join("")}</div></div><div style="overflow:auto"><div class="calendar-grid">${grid}</div></div></article></div>`;
}

function renderInbox() {
  const selected = threads[activeThread];
  const visibleThreads = threads.filter(thread => inboxFilter === "all" || (inboxFilter === "unread" && thread.unread) || inboxFilter === "assigned");
  const threadRows = visibleThreads.map(thread => {
    const index = threads.indexOf(thread);
    return `<button class="thread-row ${index === activeThread ? "active" : ""}" data-thread="${index}">${avatar(thread.initials, thread.avatar)}<div class="thread-row-copy"><div class="thread-row-title"><strong>${thread.name}</strong><time>${thread.time}</time></div><p>${thread.preview}</p></div>${thread.unread ? '<i class="thread-unread"></i>' : ""}</button>`;
  }).join("");
  const threadMessages = messages.filter(message => message.threadId === selected.id);
  const bubbles = threadMessages.map(message => {
    const out = message.direction === "OUTBOUND";
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: applicationTimeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt));
    return `<div class="bubble-row ${out ? "outgoing" : ""}">${out ? "" : avatar(selected.initials, selected.avatar)}<div class="bubble">${escapeHtml(message.body)}<time>${time}</time></div></div>`;
  }).join("");
  return `${pageHeading(pageMeta.inbox, "Inbox", "Keep every guest conversation warm, timely, and connected to the stay.", `<button class="button button-primary" data-action="new-message">${icon("pencil")} New message</button>`)}
    <article class="surface inbox-layout"><aside class="inbox-list"><div class="inbox-list-header"><h2>Conversations</h2><span>${threads.filter(thread => thread.unread).length} unread</span></div><div class="inbox-filter"><button class="${inboxFilter === "all" ? "active" : ""}" data-inbox-filter="all">All</button><button class="${inboxFilter === "unread" ? "active" : ""}" data-inbox-filter="unread">Unread</button><button class="${inboxFilter === "assigned" ? "active" : ""}" data-inbox-filter="assigned">Assigned to me</button></div>${threadRows || '<div class="empty-state inbox-empty">No conversations in this view.</div>'}</aside><section class="conversation"><div class="conversation-header"><div class="conversation-person">${avatar(selected.initials, selected.avatar)}<div><strong>${selected.name}</strong><span>${selected.channel}</span></div></div><div class="conversation-actions"><button class="icon-button" aria-label="Call guest" data-action="call-guest">${icon("phone")}</button><button class="icon-button" aria-label="More options" data-action="conversation-options">${icon("more-horizontal")}</button></div></div><div class="conversation-body"><div class="date-divider">Today · ${formatLongDate(todayIso())}</div>${bubbles || '<div class="empty-state">No messages yet.</div>'}</div><form class="composer" id="messageForm"><button type="button" class="icon-button" aria-label="Attach file" data-action="attach-file">${icon("paperclip")}</button><input id="messageInput" placeholder="Write a reply to ${selected.name}..." required /><button type="submit" class="button button-primary" id="sendMessage">${icon("send")} Send</button></form></section></article>`;
}

function renderTasks() {
  const visibleTasks = tasks.filter(task => taskFilter === "all" || task.category.toLowerCase() === taskFilter);
  const rows = visibleTasks.map(task => `<tr class="clickable-row" data-task="${task.id}">
    <td><input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""} /></td>
    <td>${task.task}</td>
    <td>${taskUnitLabel(task)}</td>
    <td>${task.category}</td>
    <td>${task.assignee}</td>
    <td>${formatTaskDue(task.due)}</td>
    <td><span class="status ${taskStatusClass(task)}">${titleCaseEnum(task.status)}</span></td>
    <td><span class="priority ${taskPriorityClass(task)}">${titleCaseEnum(task.priority)}</span></td>
    <td><button class="icon-button" data-action="task-options" aria-label="Task options">${icon("more-vertical")}</button></td>
  </tr>`).join("");
  return `${pageHeading(pageMeta.tasks, "Tasks", "Housekeeping, maintenance, inspection, and guest requests in one queue.", `<button class="button button-primary" data-action="add-task">${icon("plus")} Add task</button>`)}
    <div class="page-toolbar"><div class="filter-group"><button class="filter-chip ${taskFilter === "all" ? "active" : ""}" data-task-filter="all">All (${tasks.length})</button><button class="filter-chip ${taskFilter === "housekeeping" ? "active" : ""}" data-task-filter="housekeeping">Housekeeping (3)</button><button class="filter-chip ${taskFilter === "maintenance" ? "active" : ""}" data-task-filter="maintenance">Maintenance (2)</button><button class="filter-chip ${taskFilter === "inspection" ? "active" : ""}" data-task-filter="inspection">Inspection (1)</button></div><div class="filter-group"><select class="select-control"><option>All properties</option><option>ARSA-001</option><option>ARSA-003</option></select><select class="select-control"><option>All status</option><option>Open</option><option>In progress</option><option>Completed</option></select></div></div>
    <article class="surface data-surface"><div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Task</th><th>Property</th><th>Category</th><th>Assigned to</th><th>Due date</th><th>Status</th><th>Priority</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="9" class="empty-state">No tasks match this view.</td></tr>'}</tbody></table></div></article>`;
}

function renderReports() {
  const metrics = monthlyPortfolioMetrics();
  const months = monthlyTrendLabels().map(label => label.split(" ")[0].slice(0, 3));
  const values = monthlyOccupancyTrend();
  const points = values.map((value, index) => `${index * 12.5},${100 - value}`).join(" ");
  const sourceCounts = Object.keys(sourceLabels).map(source => ({
    source,
    label: sourceLabels[source],
    count: reservations.filter(reservation => isActiveReservation(reservation) && reservation.source === source).length
  }));
  const totalSourceBookings = sourceCounts.reduce((sum, item) => sum + item.count, 0);
  const sourcePercent = sourceCounts.map(item => ({ ...item, percent: totalSourceBookings ? Math.round((item.count / totalSourceBookings) * 100) : 0 }));
  const airbnbPercent = sourcePercent.find(item => item.source === "airbnb")?.percent || 0;
  const bookingPercent = sourcePercent.find(item => item.source === "booking_com")?.percent || 0;
  const donutDirectStart = airbnbPercent + bookingPercent;
  return `${pageHeading(pageMeta.reports, "Reports", "Revenue, occupancy, booking source, and owner-ready performance summaries.", `<button class="button button-secondary" data-action="export-report">${icon("download")} Export</button>`)}
    <div class="report-tabs">${["Overview", "Occupancy", "Revenue", "Booking Source", "Owner Report"].map((tab, index) => `<button class="${index === 0 ? "active" : ""}" data-action="report-tab">${tab}</button>`).join("")}</div>
    <section class="metrics-grid report-metrics"><article class="metric-card"><div class="metric-top"><span class="metric-label">Occupancy Rate</span><span class="metric-icon green">${icon("activity")}</span></div><div class="metric-value">${metrics.occupancyRate}%</div><div class="metric-foot"><span class="trend-up">${metrics.bookedNights} nights</span><span>${applicationMonthLabel()}</span></div></article><article class="metric-card"><div class="metric-top"><span class="metric-label">Total Bookings</span><span class="metric-icon blue">${icon("book-open")}</span></div><div class="metric-value">${metrics.bookings}</div><div class="metric-foot"><span>Active reservations</span></div></article><article class="metric-card"><div class="metric-top"><span class="metric-label">Net Revenue</span><span class="metric-icon green">${icon("trending-up")}</span></div><div class="metric-value metric-value-small">${formatCurrency(metrics.netRevenue)}</div><div class="metric-foot"><span>After OTA commission</span></div></article><article class="metric-card"><div class="metric-top"><span class="metric-label">Average Daily Rate</span><span class="metric-icon gold">${icon("plus")}</span></div><div class="metric-value metric-value-small">${formatCurrency(metrics.adr)}</div><div class="metric-foot"><span>Accommodation revenue / night</span></div></article></section>
    <section class="report-grid"><article class="surface"><div class="surface-header"><div><h2 class="surface-title">Occupancy Trend</h2><p class="surface-subtitle">${monthlyTrendLabels()[0]} to ${monthlyTrendLabels()[8]}</p></div></div><div class="line-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="#258766" stroke-width="2.5" vector-effect="non-scaling-stroke"></polyline>${values.map((value, index) => `<circle cx="${index * 12.5}" cy="${100 - value}" r="1.8" fill="#082d23"></circle>`).join("")}</svg><div class="line-labels">${months.map(month => `<span>${month}</span>`).join("")}</div></div></article><article class="surface"><div class="surface-header"><div><h2 class="surface-title">Bookings by Source</h2><p class="surface-subtitle">Active reservations</p></div></div><div class="donut-wrap"><div class="donut" style="background: conic-gradient(#ef6f9e 0 ${airbnbPercent}%, #4f83ff ${airbnbPercent}% ${donutDirectStart}%, #41b883 ${donutDirectStart}% 100%)"><strong>${metrics.bookings}</strong><span>Bookings</span></div><div class="source-breakdown">${sourcePercent.map(item => `<span><i class="legend-dot ${item.source === "airbnb" ? "coral-dot" : item.source === "booking_com" ? "blue-dot" : ""}"></i>${item.label} <strong>${item.percent}%</strong></span>`).join("")}</div></div></article></section>`;
}

function renderSettings() {
  const current = pendingLanguage === "id" ? "id" : "en";
  return `${pageHeading({ eyebrow: text("settingsEyebrow") }, text("settingsTitle"), text("settingsCopy"), `<button class="button button-primary" data-save-language>${icon("save")} ${text("save")}</button>`)}
    <div class="settings-layout">
      <aside class="settings-nav surface">
        <button class="settings-nav-item active">${icon("languages")} ${language === "id" ? "Bahasa" : "Language"}</button>
        <button class="settings-nav-item" data-action="settings-team">${icon("users")} ${language === "id" ? "Tim & akses" : "Team & access"}</button>
        <button class="settings-nav-item" data-action="settings-channels">${icon("plug")} ${language === "id" ? "Channel" : "Channels"}</button>
        <button class="settings-nav-item" data-action="settings-templates">${icon("file-text")} ${language === "id" ? "Template pesan" : "Message templates"}</button>
      </aside>
      <section class="settings-main">
        <article class="surface settings-card">
          <div class="settings-card-header"><div><span class="eyebrow">${text("currentLanguage")}</span><h2>${text("languageTitle")}</h2><p>${text("languageCopy")}</p></div><span class="settings-status">${language === "id" ? text("indonesian") : text("english")}</span></div>
          <div class="language-options">
            <label class="language-option ${current === "en" ? "selected" : ""}"><input type="radio" name="language" value="en" ${current === "en" ? "checked" : ""} /><span class="language-flag">EN</span><span><strong>${text("english")}</strong><small>Use English throughout the workspace</small></span><i data-lucide="check-circle-2"></i></label>
            <label class="language-option ${current === "id" ? "selected" : ""}"><input type="radio" name="language" value="id" ${current === "id" ? "checked" : ""} /><span class="language-flag">ID</span><span><strong>${text("indonesian")}</strong><small>Gunakan Bahasa Indonesia di seluruh workspace</small></span><i data-lucide="check-circle-2"></i></label>
          </div>
        </article>
        <article class="surface settings-card settings-coming-soon"><div class="settings-card-header"><div><span class="eyebrow">${language === "id" ? "Konfigurasi berikutnya" : "Next configuration"}</span><h2>${language === "id" ? "Siapkan workspace Anda" : "Shape your workspace"}</h2><p>${language === "id" ? "Pengaturan tim, channel, template, dan notifikasi akan tersedia di area ini." : "Team, channel, template, and notification settings will live here as the workspace grows."}</p></div></div><div class="settings-progress"><span style="width: 42%"></span></div><div class="settings-progress-copy"><span>${language === "id" ? "Fondasi PMS" : "PMS foundation"}</span><strong>42%</strong></div></article>
      </section>
    </div>`;
}

function renderPlaceholder(page) {
  const content = {
    tasks: { title: "Keep the day moving.", copy: "Housekeeping, maintenance, and guest requests will live here as one shared operations queue.", icon: "list-checks", items: ["7 tasks due today", "3 housekeeping turnovers", "2 maintenance follow-ups", "SLA tracking and assignees"] },
    reports: { title: "Performance, made legible.", copy: "Revenue, occupancy, booking source, and owner-ready reporting are being shaped into one clear reporting layer.", icon: "chart-no-axes-combined", items: ["Monthly revenue summary", "Occupancy by villa", "Booking source mix", "Owner statement export"] },
    owners: { title: "A calm owner relationship.", copy: "Owner profiles, villa ownership, stays, and future portal permissions will be managed from this workspace.", icon: "key-round", items: ["Owner directory", "Stay calendar", "Monthly statements", "Portal access controls"] },
    settings: { title: "Make the workspace yours.", copy: "Configure users, channels, templates, notifications, and portfolio defaults as the operation grows.", icon: "settings-2", items: ["Team and permissions", "Channel connections", "Message templates", "Portfolio preferences"] }
  }[page];
  return `${pageHeading(pageMeta[page], content.title, content.copy, `<button class="button button-primary" data-action="notify">${icon("sparkles")} Explore setup</button>`)}<div class="placeholder-page"><article class="surface"><div class="placeholder-icon">${icon(content.icon)}</div><h2>${content.title}</h2><p>${content.copy}</p><div class="placeholder-list">${content.items.map(item => `<div>${icon("check")} ${item}</div>`).join("")}</div></article></div>`;
}

function renderPage(page = activePage) {
  activePage = page;
  breadcrumbPage.textContent = navText(page);
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  const renders = { dashboard: renderDashboard, calendar: renderCalendar, reservations: renderReservations, properties: renderProperties, guests: renderGuests, inbox: renderInbox, tasks: renderTasks, reports: renderReports, owners: renderOwners, settings: renderSettings };
  pageContent.innerHTML = renders[page] ? renders[page]() : renderPlaceholder(page);
  applyLanguage();
  refreshIcons();
  bindPageActions();
}

function openModal() { openReservationModal(); }
function closeModal() { modalBackdrop.hidden = true; document.body.style.overflow = ""; }

function bindPageActions() {
  pageContent.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
    const page = button.dataset.page;
    if (page) { renderPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }));
  pageContent.querySelectorAll("[data-open-modal]").forEach(button => button.addEventListener("click", openModal));
  pageContent.querySelectorAll("[data-thread]").forEach(button => button.addEventListener("click", () => { activeThread = Number(button.dataset.thread); renderPage("inbox"); }));
  pageContent.querySelectorAll("tr[data-reservation]").forEach(row => row.addEventListener("click", () => {
    const item = reservations.find(reservation => reservation.id === row.dataset.reservation);
    if (!item) return;
    const view = reservationView(item);
    openDetail(view.reference, "Reservation", [
      ["Reservation reference", view.reference],
      ["Guest", view.guestName],
      ["Property", `${view.propertyCode} · ${view.propertyName}`],
      ["Unit", `${view.unitCode} · ${view.unitName}`],
      ["Check-in", item.checkIn],
      ["Check-out", item.checkOut],
      ["Nights", String(view.nights)],
      ["Adults", String(item.adults)],
      ["Children", String(item.children)],
      ["Infants", String(item.infants)],
      ["Source", view.sourceLabel],
      ["External reservation ID", item.externalReservationId || "—"],
      ["Status", view.statusLabel],
      ["Payment status", item.paymentStatus],
      ["Accommodation revenue", formatCurrency(canonicalAccommodationRevenue(item))],
      ["Cleaning fee", formatCurrency(item.cleaningFee)],
      ["Taxes", formatCurrency(item.taxes)],
      ["Extras", formatCurrency(item.extras)],
      ["Discounts", formatCurrency(item.discounts)],
      ["OTA commission", formatCurrency(item.otaCommission)],
      ["Payment processing fee", formatCurrency(item.paymentProcessingFee)],
      ["Total booking value", formatCurrency(view.total)],
      ["Net revenue", formatCurrency(view.netRevenue)],
      ["Estimated arrival", item.estimatedArrivalTime || "—"],
      ["Internal notes", item.internalNotes || "—"],
      ["Guest notes", item.guestNotes || "—"]
    ], reservationActionFooter(item));
  }));
  pageContent.querySelectorAll("[data-property]").forEach(card => card.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    const item = properties.find(property => property.id === card.dataset.property);
    if (!item) return;
    const [status] = statusForProperty(propertyOperationalStatus(item));
    const metrics = propertyMetrics(item.id);
    const propertyUnits = getUnitsByPropertyId(item.id);
    openDetail(item.code, "Property", [
      ["Villa", item.name],
      ["Location", item.location],
      ["Owner", ownerName(item.ownerId)],
      ["Inventory", `${propertyUnits.length} ${propertyUnits.length === 1 ? "unit" : "units"}`],
      ["Units", propertyUnits.map(unit => unit.code).join(", ")],
      ["Status", status],
      ["Occupancy", `${metrics.occupancy}%`],
      ["Month to date", formatCurrency(metrics.revenue)],
      ["Next action", propertyNextAction(item.id)]
    ], `<button class="button button-secondary" data-action="add-unit" data-property-id="${item.id}">${icon("plus")} Add unit</button><button class="button button-secondary" data-page="calendar">${icon("calendar-days")} Open calendar</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`);
  }));
  pageContent.querySelectorAll("[data-guest]").forEach(row => row.addEventListener("click", () => {
    const item = guests.find(guest => guest.id === row.dataset.guest);
    if (!item) return;
    const stayInfo = guestLatestStay(item.id);
    openDetail(guestDisplayName(item), "Guest profile", [
      ["Email", item.email],
      ["Country", item.country],
      ["Latest stay", stayInfo.stay],
      ["Last contact", stayInfo.last],
      ["Profile", item.tier || "Standard guest"]
    ], `<button class="button button-secondary" data-page="inbox">${icon("message-square")} Open conversation</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`);
  }));
  pageContent.querySelectorAll("[data-owner]").forEach(row => row.addEventListener("click", () => {
    const item = owners.find(owner => owner.id === row.dataset.owner);
    if (!item) return;
    const linkedProperties = ownerProperties(item.id);
    const agreement = linkedProperties.map(property => managementAgreementForProperty(property.id)).find(Boolean);
    openDetail(item.name, "Owner profile", [
      ["Owner code", item.ownerCode],
      ["Email", item.email || "-"],
      ["Phone", item.phone || "-"],
      ["Address", item.address || "-"],
      ["Properties", linkedProperties.map(property => property.code).join(", ") || "-"],
      ["Agreement", agreement?.packageName || "No active agreement"],
      ["Management fee", agreement ? `${agreement.managementFeeValue}%` : "-"],
      ["Status", titleCaseEnum(item.status)]
    ], `<button class="button button-secondary" data-action="add-property">${icon("home")} Add property</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`);
  }));
  pageContent.querySelectorAll(".reservation-bar[data-reservation]").forEach(bar => bar.addEventListener("click", event => {
    event.stopPropagation();
    const item = reservations.find(reservation => reservation.id === bar.dataset.reservation);
    if (!item) return;
    const view = reservationView(item);
    openDetail(view.reference, "Calendar booking", [
      ["Guest", view.guestName],
      ["Property", view.propertyCode],
      ["Stay", `${view.dates} · ${view.nights} nights`],
      ["Source", view.sourceLabel],
      ["Status", view.statusLabel],
      ["Total charged", formatCurrency(view.total)],
      ["Net revenue", formatCurrency(view.netRevenue)]
    ], `<button class="button button-secondary" data-page="reservations">${icon("book-marked")} Open reservation</button>${reservationActionFooter(item)}`);
  }));
  pageContent.querySelectorAll(".reservation-bar[data-block]").forEach(bar => bar.addEventListener("click", event => {
    event.stopPropagation();
    const block = blocks.find(item => item.id === bar.dataset.block);
    if (!block) return;
    const unit = getUnitById(block.unitId);
    const property = getPropertyById(block.propertyId);
    openDetail(calendarBlockTypeLabels[normalizeStatus(block.type)] || "Calendar block", "Availability block", [
      ["Property", property ? `${property.code} · ${property.name}` : "Unknown property"],
      ["Unit", unit ? `${unit.code} · ${unit.name}` : "Unknown unit"],
      ["Dates", `${formatLongDate(block.startDate)} — ${formatLongDate(block.endDate)}`],
      ["Type", calendarBlockTypeLabels[normalizeStatus(block.type)] || titleCaseEnum(block.type)],
      ["Reason", block.reason || "—"],
      ["Notes", block.notes || "—"]
    ], `<button class="button button-secondary" data-action="remove-calendar-block" data-block-id="${escapeHtml(block.id)}">${icon("trash-2")} Remove block</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`);
  }));
  pageContent.querySelectorAll("[data-task-toggle]").forEach(input => input.addEventListener("click", event => {
    event.stopPropagation();
    const item = tasks.find(task => task.id === input.dataset.taskToggle);
    if (!item) return;
    item.done = input.checked;
    item.status = input.checked ? "COMPLETED" : "OPEN";
    item.statusClass = input.checked ? "confirmed" : "checked";
    saveCollection("arsavaya-tasks", tasks);
    showToast(`${item.task} marked ${item.status.toLowerCase()}`);
    renderPage("tasks");
  }));
  pageContent.querySelectorAll("[data-task]").forEach(row => row.addEventListener("click", event => {
    if (event.target.closest("button") || event.target.closest("input")) return;
    const item = tasks.find(task => task.id === row.dataset.task);
    if (!item) return;
    openDetail(item.task, "Task", [
      ["Unit", taskUnitLabel(item)],
      ["Category", item.category],
      ["Assigned to", item.assignee],
      ["Due date", item.due],
      ["Status", item.status.replaceAll("_", " ")],
      ["Priority", item.priority]
    ], `<button class="button button-secondary" data-action="assign-task">${icon("user-plus")} Assign</button><button class="button button-primary" data-close-drawer>${icon("check")} Done</button>`);
  }));
  pageContent.querySelectorAll("[data-calendar-nav]").forEach(button => button.addEventListener("click", () => {
    calendarWeekOffset += Number(button.dataset.calendarNav);
    showToast(calendarWeekOffset === 0 ? "Showing current week" : calendarWeekOffset > 0 ? "Showing next week" : "Showing previous week");
    renderPage("calendar");
  }));
  pageContent.querySelectorAll("[data-calendar-view]").forEach(button => button.addEventListener("click", () => {
    calendarView = button.dataset.calendarView;
    showToast(`${calendarView} calendar view selected`);
    renderPage("calendar");
  }));
  pageContent.querySelectorAll("[data-calendar-day]").forEach(button => button.addEventListener("click", () => {
    pageContent.querySelectorAll("[data-calendar-day]").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    showToast(`Calendar focused on ${formatLongDate(button.dataset.calendarDay)}`);
  }));
  pageContent.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "new-message") renderPage("inbox");
    else if (action === "create-calendar-block") openCalendarBlockModal();
    else if (action === "remove-calendar-block") removeCalendarBlock(button.dataset.blockId);
    else if (action === "add-owner") openOwnerModal();
    else if (action === "add-property") openPropertyModal();
    else if (action === "add-unit") openUnitModal(button.dataset.propertyId);
    else if (action === "add-guest") openGuestModal();
    else if (action === "edit-reservation") openReservationEditModal(button.dataset.reservationId);
    else if (action === "reservation-status") updateReservationStatus(button.dataset.reservationId, button.dataset.nextStatus);
    else if (action === "export") exportRows("arsavaya-reservations.csv", ["Reference", "Guest", "Property ID", "Property", "Unit ID", "Unit", "Check-in", "Check-out", "Nights", "Source", "External ID", "Status", "Payment status", "Accommodation revenue", "Cleaning fee", "Taxes", "Extras", "Discounts", "OTA commission", "Payment processing fee", "Total charged", "Net revenue"], reservations.map(row => { const view = reservationView(row); return [view.reference, view.guestName, row.propertyId, view.propertyCode, view.unitId, `${view.unitCode} · ${view.unitName}`, row.checkIn, row.checkOut, view.nights, view.sourceLabel, row.externalReservationId || "", view.statusLabel, row.paymentStatus, canonicalAccommodationRevenue(row), row.cleaningFee, row.taxes, row.extras, row.discounts, row.otaCommission, row.paymentProcessingFee, view.total, view.netRevenue]; }));
    else if (action === "guest-export") exportRows("arsavaya-guests.csv", ["Guest ID", "Name", "Email", "Phone", "Country", "Latest stay", "Latest stay date", "Profile"], guests.map(guest => { const stayInfo = guestLatestStay(guest.id); return [guest.id, guestDisplayName(guest), guest.email, guest.phone, guest.country, stayInfo.stay, stayInfo.last, guest.tier || "Standard"]; }));
    else if (action === "property-export") exportRows("arsavaya-properties.csv", ["Property ID", "Code", "Property", "Location", "Type", "Unit count", "Unit IDs", "Occupancy", "Net revenue"], properties.map(property => { const metrics = propertyMetrics(property.id); const propertyUnits = getUnitsByPropertyId(property.id); return [property.id, property.code, property.name, property.location, property.type, propertyUnits.length, propertyUnits.map(unit => unit.id).join(" | "), `${metrics.occupancy}%`, metrics.revenue]; }));
    else if (action === "export-report") { const metrics = monthlyPortfolioMetrics(); exportRows("arsavaya-report.csv", ["Metric", "Value"], [["Occupancy Rate", `${metrics.occupancyRate}%`], ["Total Bookings", metrics.bookings], ["Net Revenue", formatCurrency(metrics.netRevenue)], ["Average Daily Rate", formatCurrency(metrics.adr)]]); }
    else if (action === "attach-file") showToast("Attachment picker placeholder activated");
    else if (action === "call-guest") showToast("Call task created for the guest");
    else if (action === "conversation-options") showToast("Conversation options opened");
    else if (action === "add-task") showToast("Task form will open in a later sprint");
    else if (action === "workspace-switcher") showToast("Arsavaya Bali workspace selected");
    else if (action === "profile-menu") showToast("Profile menu opened");
    else if (action === "task-options") showToast("Task options opened");
    else if (action === "report-tab") {
      button.parentElement.querySelectorAll("button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      showToast(`${button.textContent.trim()} report selected`);
    }
    else showToast(action === "sync-calendar" ? "Channels synced just now" : action === "owner-report" ? "Owner report is being prepared" : "Action queued for your workspace");
  }));
  pageContent.querySelectorAll(".filter-chip").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.resFilter) {
      reservationFilter = button.dataset.resFilter;
      renderPage("reservations");
      if (reservationFilter === "pending") showToast("Showing reservations that need attention");
    } else if (button.dataset.propertyFilter) {
      propertyFilter = button.dataset.propertyFilter;
      renderPage("properties");
    } else if (button.dataset.guestFilter) {
      guestFilter = button.dataset.guestFilter;
      renderPage("guests");
    } else if (button.dataset.taskFilter) {
      taskFilter = button.dataset.taskFilter;
      renderPage("tasks");
    } else {
      button.parentElement.querySelectorAll(".filter-chip").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
    }
  }));
  const reservationSourceSelect = document.getElementById("reservationSource");
  if (reservationSourceSelect) reservationSourceSelect.addEventListener("change", event => { reservationSource = event.target.value; renderPage("reservations"); });
  const reservationSearchInput = document.getElementById("reservationSearch");
  if (reservationSearchInput) reservationSearchInput.addEventListener("input", event => { reservationSearch = event.target.value; renderPage("reservations"); document.getElementById("reservationSearch")?.focus(); });
  const propertySortSelect = document.getElementById("propertySort");
  if (propertySortSelect) propertySortSelect.addEventListener("change", event => { propertySort = event.target.value; renderPage("properties"); });
  const guestSearchInput = document.getElementById("guestSearch");
  if (guestSearchInput) guestSearchInput.addEventListener("input", event => { guestSearch = event.target.value; renderPage("guests"); document.getElementById("guestSearch")?.focus(); });
  pageContent.querySelectorAll("[data-inbox-filter]").forEach(button => button.addEventListener("click", () => { inboxFilter = button.dataset.inboxFilter; renderPage("inbox"); }));
  pageContent.querySelectorAll("input[name='language']").forEach(input => input.addEventListener("change", () => {
    pendingLanguage = input.value;
    pageContent.querySelectorAll(".language-option").forEach(option => option.classList.toggle("selected", option.querySelector("input").checked));
    showToast(input.value === "id" ? languageCopy.id.indonesianApplied : languageCopy.en.englishApplied);
  }));
  pageContent.querySelectorAll("[data-save-language]").forEach(button => button.addEventListener("click", () => persistLanguage(pendingLanguage)));
  const sendMessage = document.getElementById("sendMessage");
  if (sendMessage) sendMessage.addEventListener("click", () => {
    const input = document.getElementById("messageInput");
    if (input.value.trim()) { showToast("Reply sent to " + threads[activeThread].name); input.value = ""; }
  });
}

drawerBackdrop.addEventListener("click", event => {
  if (event.target === drawerBackdrop || event.target.closest("#closeDrawer") || event.target.closest("[data-close-drawer]")) closeDrawer();
  const pageTarget = event.target.closest("[data-page]");
  if (pageTarget) {
    closeDrawer();
    renderPage(pageTarget.dataset.page);
  }
  const modalTarget = event.target.closest("[data-open-modal]");
  if (modalTarget) {
    closeDrawer();
    openModal();
  }
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "edit-reservation") {
      closeDrawer();
      openReservationEditModal(actionTarget.dataset.reservationId);
    } else if (action === "reservation-status") {
      closeDrawer();
      updateReservationStatus(actionTarget.dataset.reservationId, actionTarget.dataset.nextStatus);
    } else {
      closeDrawer();
      if (action === "add-unit") openUnitModal(actionTarget.dataset.propertyId);
      else if (action === "add-property") openPropertyModal();
      else if (action === "remove-calendar-block") removeCalendarBlock(actionTarget.dataset.blockId);
      else showToast("Action queued from details panel");
    }
  }
});

document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach(navItem => navItem.classList.remove("active"));
  item.classList.add("active");
  renderPage(item.dataset.page);
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}));
modalBackdrop.addEventListener("click", event => {
  if (event.target === modalBackdrop || event.target.closest(".close-modal")) closeModal();
});
modalBackdrop.addEventListener("submit", handleEntityFormSubmit);
document.getElementById("notificationButton").addEventListener("click", () => showToast("You have 3 urgent conversations to review"));
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("openSearch").addEventListener("click", () => document.getElementById("searchWrap").classList.toggle("visible"));
document.getElementById("globalSearch").addEventListener("keydown", event => { if (event.key === "Enter") globalSearch(event.currentTarget.value); });
document.querySelector(".topbar-user").addEventListener("click", () => showToast("Profile menu opened"));
document.querySelector(".workspace-switcher").addEventListener("click", () => showToast("Arsavaya Bali workspace selected"));
document.querySelector(".profile-card").addEventListener("click", () => showToast("Profile menu opened"));
document.getElementById("pageContent").addEventListener("click", event => {
  const dateFilter = event.target.closest(".date-filter");
  if (dateFilter) showToast("Date range selector opened");
  const propertyAction = event.target.closest("[data-property-action]");
  if (propertyAction) {
    event.stopPropagation();
    const property = properties.find(item => item.id === propertyAction.dataset.propertyAction);
    if (property) showToast(`${property.code} actions opened`);
  }
});
document.addEventListener("keydown", event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("globalSearch").focus(); document.getElementById("searchWrap").classList.add("visible"); } if (event.key === "Escape") closeModal(); });

renderPage();
