import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  meetingTime: timestamp("meeting_time").notNull(),
  bookingTime: timestamp("booking_time").notNull().default(sql`now()`),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  name: true,
  email: true,
  meetingTime: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Voice Agent Schema Types
export const voiceAgentRequestSchema = z.object({
  sessionId: z.string(),
  text: z.string(),
  final: z.boolean(),
});

export const voiceAgentResponseSchema = z.object({
  replyText: z.string(),
  askFor: z.string().nullable(),
  readyToBook: z.boolean(),
  sessionState: z.record(z.any()),
  audioUrl: z.string().optional(), // TTS audio generated inline
});

export const bookingRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  meetingTime: z.string().optional(),
});

export const bookingResponseSchema = z.object({
  calendlyUrl: z.string().url(),
});

export const ttsRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  voiceId: z.string().optional(),
});

export const ttsResponseSchema = z.object({
  audioUrl: z.string().url(),
});

export type VoiceAgentRequest = z.infer<typeof voiceAgentRequestSchema>;
export type VoiceAgentResponse = z.infer<typeof voiceAgentResponseSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
export type TTSRequest = z.infer<typeof ttsRequestSchema>;
export type TTSResponse = z.infer<typeof ttsResponseSchema>;

// In-memory session state interface (not stored in database)
export interface VoiceAgentSession {
  sessionId: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>;
  collectedData: {
    name?: string;
    email?: string;
    meetingPreference?: string;
    userPreferredTime?: string;
    rejectedSlots: string[];
    lastSuggestedSlot?: string;
  };
  lastUpdated: Date;
}
