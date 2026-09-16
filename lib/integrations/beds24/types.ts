/**
 * Beds24 API V2 response schemas.
 * VERIFIED against real Beds24 GET /bookings response (Section 8 of reference).
 * Only fields ARSAVAYA actually needs are modeled.
 */
import { z } from 'zod';

const Beds24Id = z.union([z.string(), z.number()]).transform((v) => String(v));

// --- wrapper for list responses ---
export const Beds24ListWrapper = z.object({
  success: z.boolean().optional(),
  type: z.string().optional(),
  count: z.number().optional(),
  pages: z
    .object({
      nextPageExists: z.boolean().optional(),
      nextPageLink: z.string().nullish(),
    })
    .optional(),
  data: z.array(z.unknown()).optional(),
});
export type Beds24ListWrapper = z.infer<typeof Beds24ListWrapper>;

// --- property ---
export const Beds24RoomTypeSchema = z.object({
  id: Beds24Id,
  name: z.string().nullish(),
  // additional fields ignored deliberately
});
export type Beds24RoomType = z.infer<typeof Beds24RoomTypeSchema>;

export const Beds24PropertySchema = z.object({
  id: Beds24Id,
  name: z.string().nullish(),
  roomTypes: z.array(Beds24RoomTypeSchema).optional(),
});
export type Beds24Property = z.infer<typeof Beds24PropertySchema>;

// --- booking ---
export const Beds24BookingSchema = z.object({
  id: Beds24Id,
  propertyId: Beds24Id.nullish(),
  roomId: Beds24Id.nullish(),
  unitId: Beds24Id.nullish(),
  status: z.string().nullish(),
  subStatus: z.string().nullish(),
  arrival: z.string().nullish(),
  departure: z.string().nullish(),
  numAdult: z.number().nullish(),
  numChild: z.number().nullish(),
  title: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  mobile: z.string().nullish(),
  apiSourceId: z.number().nullish(),
  apiSource: z.string().nullish(),
  apiReference: z.string().nullish(),
  referer: z.string().nullish(),
  reference: z.string().nullish(),
  bookingTime: z.string().nullish(),
  modifiedTime: z.string().nullish(),
  cancelTime: z.string().nullish(),
  price: z.number().nullish(),
});
export type Beds24Booking = z.infer<typeof Beds24BookingSchema>;

// --- apiSourceId â†’ channel name (VERIFIED Section 10) ---
export const BEDS24_API_SOURCE: Record<number, string> = {
  0: 'Direct',
  14: 'Expedia',
  17: 'Agoda',
  19: 'Booking.com',
  30: 'Vrbo',
  46: 'Airbnb',
  56: 'Traveloka',
  86: 'Tiket',
};