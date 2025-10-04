import { type User, type InsertUser, type Booking, type InsertBooking, users, bookings } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, gte, lte, sql, and } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByDate(date: Date): Promise<Booking[]>;
  getAvailableTimeSlots(date: Date): Promise<string[]>;
}

// Database client setup - only if DATABASE_URL is available
let db: ReturnType<typeof drizzle> | null = null;
if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool);
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bookings: Map<string, Booking>;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { 
      ...insertBooking, 
      id,
      bookingTime: new Date()
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.bookings.values()).filter(
      booking => booking.meetingTime >= startOfDay && booking.meetingTime <= endOfDay
    );
  }

  async getAvailableTimeSlots(date: Date): Promise<string[]> {
    const bookedSlots = await this.getBookingsByDate(date);
    const bookedTimes = bookedSlots.map(booking => 
      booking.meetingTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      })
    );

    // Define available time slots (9 AM to 6 PM, every 30 minutes)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (!bookedTimes.includes(timeString)) {
          const displayTime = new Date();
          displayTime.setHours(hour, minute);
          allSlots.push(displayTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }));
        }
      }
    }

    return allSlots;
  }
}

export class DatabaseStorage implements IStorage {
  private getDb() {
    if (!db) {
      throw new Error("Database not initialized - DATABASE_URL not available");
    }
    return db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const dbClient = this.getDb();
    const result = await dbClient.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const dbClient = this.getDb();
    const result = await dbClient.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const dbClient = this.getDb();
    const result = await dbClient.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const dbClient = this.getDb();
    const result = await dbClient.insert(bookings).values({
      ...insertBooking,
      bookingTime: sql`now()`
    }).returning();
    return result[0];
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    try {
      const dbClient = this.getDb();
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await dbClient.select()
        .from(bookings)
        .where(
          and(
            gte(bookings.meetingTime, startOfDay),
            lte(bookings.meetingTime, endOfDay)
          )
        );
    } catch (error) {
      console.warn('Database query failed, returning empty bookings:', error);
      return []; // Graceful fallback
    }
  }

  async getAvailableTimeSlots(date: Date): Promise<string[]> {
    let bookedSlots: Booking[] = [];
    try {
      bookedSlots = await this.getBookingsByDate(date);
    } catch (error) {
      console.warn('Failed to get booked slots, assuming all slots available:', error);
      bookedSlots = []; // All slots available if DB fails
    }
    const bookedTimes = bookedSlots.map(booking => 
      booking.meetingTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      })
    );

    // Define available time slots (9 AM to 6 PM, every 30 minutes)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (!bookedTimes.includes(timeString)) {
          const displayTime = new Date();
          displayTime.setHours(hour, minute);
          allSlots.push(displayTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }));
        }
      }
    }

    return allSlots;
  }
}

// Use PostgreSQL database if available, otherwise fallback to in-memory storage
export const storage = (process.env.DATABASE_URL && db) ? new DatabaseStorage() : new MemStorage();
