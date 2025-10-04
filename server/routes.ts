import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { AssemblyAI } from "assemblyai";
import {
  voiceAgentRequestSchema,
  voiceAgentResponseSchema,
  bookingRequestSchema,
  bookingResponseSchema,
  ttsRequestSchema,
  ttsResponseSchema,
  type VoiceAgentSession,
  type VoiceAgentRequest,
  type VoiceAgentResponse,
  type BookingRequest,
  type BookingResponse,
  type TTSRequest,
  type TTSResponse
} from "@shared/schema";

// In-memory session storage
const sessions: Map<string, VoiceAgentSession> = new Map();

// Initialize Groq client (primary) and OpenAI client (fallback)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize ElevenLabs client
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Initialize AssemblyAI client for token generation
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
let assemblyAIClient: AssemblyAI | null = null;

if (ASSEMBLYAI_API_KEY) {
  assemblyAIClient = new AssemblyAI({
    apiKey: ASSEMBLYAI_API_KEY,
  });
}

// Helper function for LLM calls with Groq primary and OpenAI fallback
async function createChatCompletion(messages: any[], useStreaming = false) {
  const baseParams = {
    messages,
    temperature: 0.7,
    max_tokens: 200,
    response_format: { type: "json_object" as const },
  };

  try {
    // Try Groq first (much faster)
    console.log("Attempting Groq LLM call...");
    const groqCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      ...baseParams,
    });

    console.log("✅ Groq call successful");
    return {
      content: groqCompletion.choices[0]?.message?.content,
      provider: "groq"
    };
  } catch (groqError) {
    console.warn("⚠️ Groq call failed, falling back to OpenAI:", groqError);

    try {
      // Fallback to OpenAI
      console.log("Attempting OpenAI fallback...");
      const openaiCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        ...baseParams,
      });

      console.log("✅ OpenAI fallback successful");
      return {
        content: openaiCompletion.choices[0]?.message?.content,
        provider: "openai"
      };
    } catch (openaiError) {
      console.error("❌ Both Groq and OpenAI failed:", openaiError);
      throw new Error("Both LLM providers failed");
    }
  }
}

// Extracted voice agent processing logic for reuse in HTTP and WebSocket
async function processVoiceAgentRequest(requestData: VoiceAgentRequest): Promise<VoiceAgentResponse> {
  const { sessionId, text, final } = requestData;

  console.log(`Voice Agent - Session: ${sessionId}, Text length: ${text.length}, Final: ${final}`);

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      messages: [{
        role: 'system',
        content: `You are SleeckOS Agent, a polite and helpful voice booking assistant. Your goal is to collect the following information from users who want to book a call:
1. Name (first and last name)
2. Email address
3. Meeting preference from available time slots

Instructions:
- Ask for ONE piece of information at a time
- Be conversational and friendly
- Keep responses short and natural for voice interaction
- When asking for EMAIL, give VERY CLEAR instructions:
  * RECOMMENDED: "Please TYPE your email address in the text field below for accuracy"
  * ALTERNATIVE: "If you prefer to speak it, say it SLOWLY and CLEARLY like: john at gmail dot com"
  * EXAMPLE: "You can say: john underscore smith at gmail dot com - speak each part carefully"
- After receiving an email, ALWAYS repeat it back EXACTLY for confirmation (e.g., "I've captured john@gmail.com. Is that correct?")
- If the email seems wrong or invalid, politely ask user to TYPE it instead
- After collecting name and email, I will provide you with a specific time slot to suggest to the user
- If user is not available for the suggested time, I will provide alternative slots
- If user rejects multiple options, ask for their preferred time
- When you have all information including confirmed meeting time, confirm everything with the user
- You MUST respond ONLY with a valid JSON object containing: {"replyText": "your response to user", "askFor": "name|email|meeting_preference|user_preferred_time|confirmation|null", "readyToBook": false/true}
- Set readyToBook to true only after user confirms all information is correct
- Use "askFor" values: "name", "email", "meeting_preference", "user_preferred_time", "confirmation", or null when done
- If the user provides multiple pieces of info at once, acknowledge all but focus on the first missing piece

Start by greeting the user and asking for their name. Remember: respond ONLY with valid JSON.`
      }],
      collectedData: {
        rejectedSlots: [] as string[],
        lastSuggestedSlot: undefined
      },
      lastUpdated: new Date()
    };
    sessions.set(sessionId, session);
  }

  // Add user message to conversation if final transcript
  if (final && text.trim()) {
    session.messages.push({ role: 'user', content: text });
    session.lastUpdated = new Date();
  }

  // Handle time slot logic
  const messagesWithContext = [...session.messages];

  // If we need to suggest meeting times
  if (session.collectedData.name && session.collectedData.email && !session.collectedData.meetingPreference && !session.collectedData.userPreferredTime) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const availableSlots = await storage.getAvailableTimeSlots(tomorrow);

    // Filter out rejected slots
    const rejectedSlots = session.collectedData.rejectedSlots || [];
    const nonRejectedSlots = availableSlots.filter(slot => !rejectedSlots.includes(slot));

    if (nonRejectedSlots.length === 0) {
      // No more slots available, ask for user preference
      messagesWithContext.push({
        role: 'system',
        content: `No more available slots. Ask the user what time they prefer for tomorrow and note that you'll check availability.`
      });
    } else if (rejectedSlots.length >= 2) {
      // User has rejected 2+ slots, ask for their preference
      messagesWithContext.push({
        role: 'system',
        content: `User has rejected multiple suggestions. Ask them what time they prefer for tomorrow. Available slots are: ${nonRejectedSlots.join(', ')}.`
      });
    } else {
      // Suggest one random available slot
      const randomSlot = nonRejectedSlots[Math.floor(Math.random() * nonRejectedSlots.length)];
      session.collectedData.lastSuggestedSlot = randomSlot;
      messagesWithContext.push({
        role: 'system',
        content: `Suggest this specific time slot: ${randomSlot}. Ask if this time works for them.`
      });
    }
  }

  // Call LLM (Groq primary, OpenAI fallback)
  const llmResponse = await createChatCompletion(messagesWithContext);
  const assistantMessage = llmResponse.content;

  if (!assistantMessage) {
    throw new Error(`No response from LLM provider (${llmResponse.provider})`);
  }

  console.log(`LLM Response from ${llmResponse.provider}:`);
  console.log("Raw response:", assistantMessage);

  // Parse the JSON response from the assistant
  let parsedResponse: {replyText: string, askFor: string | null, readyToBook?: boolean};
  try {
    parsedResponse = JSON.parse(assistantMessage);
    console.log("Parsed response:", parsedResponse);

    // Validate required fields
    if (!parsedResponse.replyText) {
      console.error("Invalid response structure:", parsedResponse);
      throw new Error("Invalid response format from LLM");
    }

    // Set default value for readyToBook if not provided
    if (typeof parsedResponse.readyToBook !== 'boolean') {
      parsedResponse.readyToBook = false;
    }
  } catch (error) {
    console.error("Failed to parse JSON response from LLM:", error);
    console.error("Raw response that failed to parse:", assistantMessage);

    // Try to extract a basic response if JSON parsing fails
    const fallbackResponse = {
      replyText: assistantMessage.includes('{') ? "I'm having trouble processing that. Could you please repeat?" : assistantMessage,
      askFor: null,
      readyToBook: false
    };
    console.log("Using fallback response:", fallbackResponse);
    parsedResponse = fallbackResponse;
  }

  // Extract collected data from the conversation context
  if (text.trim()) {
    // Extract name when agent is asking for email next
    if (parsedResponse.askFor === "email" && !session.collectedData.name) {
      const nameMatch = text.match(/(?:my name is |i'm |i am |call me )([a-zA-Z\s]+)/i);
      session.collectedData.name = nameMatch ? nameMatch[1].trim() : text.trim();
    }
    // Extract email when agent just asked for it (current turn) OR when we don't have it yet
    else if ((parsedResponse.askFor === "meeting_preference" || parsedResponse.askFor === "email") && !session.collectedData.email) {
      const extractedEmail = parseEmailFromVoiceText(text);
      if (extractedEmail && isValidEmail(extractedEmail)) {
        session.collectedData.email = extractedEmail;
      }
    }
    // Handle meeting preference responses and capture acceptance at any stage
    else if (session.collectedData.email && !session.collectedData.meetingPreference) {
      const userResponse = text.toLowerCase().trim();

      // Check for rejection and acceptance indicators with very specific rejection templates
      const rejectionPatterns = [
        // Very specific "no" rejection templates
        /^no$|^no[,.]|^no\s+that|^no\s+I|^no\s+it/i,      // "no" at start with rejection context
        /\bno[,.\s]+(?:that|it|this)\s+(?:doesn't|won't|can't|isn't|doesn't|not)/i,

        // Direct rejection patterns (no broad matching)
        /doesn't work/i,
        /won't work/i,
        /can't work/i,
        /not available/i,
        /not possible/i,
        /not happening/i,
        /unavailable/i,
        /isn't possible/i,
        /isn't available/i,
        /isn't good/i,
        /aren't available/i,
        /inconvenient/i,
        /doesn't suit/i,
        /not suitable/i,
        /not free/i,
        /not open/i,
        // Remove the broad busy pattern - will handle this separately
        /conflict/i,
        /bad time/i,
        /too early/i,
        /too late/i,
        /not good/i,
        /terrible/i,
        /awful/i,
        /impossible/i,
        /out of the question/i,

        // Specific negative time contexts
        /(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock))\s+(?:doesn't|won't|can't|isn't|not)/i,
        /(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock))\s+(?:is|would\s+be)\s+(?:bad|terrible|awful|impossible)/i
      ];

      const acceptanceWords = ['yes', 'that works', 'sounds good', 'perfect', 'great', 'sure', 'works for me', "let's do it", 'good', 'fine', 'okay', 'ok', 'that time is fine', 'excellent', 'wonderful'];

      // Check rejection patterns plus the special "busy" handling
      const hasRejection = rejectionPatterns.some(pattern => pattern.test(userResponse)) || isBusyRejection(userResponse);
      const hasAcceptance = acceptanceWords.some(word => userResponse.includes(word));

      // Parse potential time preference
      const parsedTime = parseTimeFromText(text);

      if (hasRejection) {
        // User is rejecting - first record the rejection
        if (session.collectedData.lastSuggestedSlot && !session.collectedData.rejectedSlots.includes(session.collectedData.lastSuggestedSlot)) {
          session.collectedData.rejectedSlots.push(session.collectedData.lastSuggestedSlot);
        }
        session.collectedData.lastSuggestedSlot = undefined; // Clear it

        // Check if they also provided an alternative time in positive context
        // Look for patterns like "no, but 3pm works" or "not that, maybe 3pm"
        const alternativePatterns = [
          /but\s+.*?(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock|in the morning|in the afternoon|in the evening))/i,
          /maybe\s+.*?(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock|in the morning|in the afternoon|in the evening))/i,
          /how about\s+.*?(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock|in the morning|in the afternoon|in the evening))/i,
          /instead\s+.*?(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock|in the morning|in the afternoon|in the evening))/i,
          /prefer\s+.*?(\d{1,2}(?::\d{2})?\s?(?:am|pm|o'clock|in the morning|in the afternoon|in the evening))/i
        ];

        let alternativeTime = null;
        for (const pattern of alternativePatterns) {
          const match = text.match(pattern);
          if (match) {
            alternativeTime = parseTimeFromText(match[1]);
            break;
          }
        }

        if (alternativeTime) {
          session.collectedData.meetingPreference = alternativeTime;
        }
      } else if (hasAcceptance && !hasRejection) {
        // User accepted the suggested time
        if (session.collectedData.lastSuggestedSlot) {
          session.collectedData.meetingPreference = session.collectedData.lastSuggestedSlot;
        }
      } else if (parsedTime && !hasRejection) {
        // User provided a specific time without rejection context - treat as preference
        // Only if the text doesn't contain negative sentiment around the time
        const timeContext = text.substring(Math.max(0, text.indexOf(parsedTime.toLowerCase()) - 20), text.indexOf(parsedTime.toLowerCase()) + parsedTime.length + 20);
        const negativeContext = ['not', "doesn't", "won't", 'bad', 'terrible', 'awful'].some(word => timeContext.includes(word));

        if (!negativeContext) {
          session.collectedData.meetingPreference = parsedTime;
        }
      }
    }
    // Handle user's preferred time using comprehensive parsing
    else if ((parsedResponse.askFor === "user_preferred_time" || parsedResponse.askFor === "confirmation") && !session.collectedData.meetingPreference) {
      const parsedTime = parseTimeFromText(text);
      if (parsedTime) {
        session.collectedData.userPreferredTime = parsedTime;
        session.collectedData.meetingPreference = parsedTime; // Use as meeting preference
      }
    }
  }

  // Detect acceptance based on assistant's askFor state transition
  // If assistant moved to 'confirmation' and we have a lastSuggestedSlot but no meetingPreference, capture it
  if (parsedResponse.askFor === 'confirmation' &&
      session.collectedData.lastSuggestedSlot &&
      !session.collectedData.meetingPreference) {
    session.collectedData.meetingPreference = session.collectedData.lastSuggestedSlot;
  }

  // Add assistant response to conversation
  session.messages.push({ role: 'assistant', content: assistantMessage });

  // Generate TTS audio inline for faster response
  let audioUrl: string | undefined;
  if (parsedResponse.replyText && ELEVENLABS_API_KEY) {
    try {
      console.log(`Generating TTS for response: ${parsedResponse.replyText.substring(0, 50)}...`);

      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: parsedResponse.replyText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        console.log(`TTS generated successfully`);
      } else {
        console.error(`TTS generation failed: ${ttsResponse.status}`);
      }
    } catch (error) {
      console.error('TTS generation error:', error);
      // Continue without audio - graceful degradation
    }
  }

  const finalResponse = {
    replyText: parsedResponse.replyText,
    askFor: parsedResponse.askFor,
    readyToBook: parsedResponse.readyToBook ?? false,
    sessionState: {
      collectedData: session.collectedData,
      sessionId: session.sessionId
    },
    audioUrl
  };

  console.log("Final voice agent response:", {
    replyText: finalResponse.replyText,
    askFor: finalResponse.askFor,
    readyToBook: finalResponse.readyToBook,
    hasAudio: !!finalResponse.audioUrl
  });

  return finalResponse;
}

// Enhanced time parsing function to handle various formats
function parseTimeFromText(text: string): string | null {
  // Multiple regex patterns to catch different time formats
  const timePatterns = [
    /(\d{1,2}:\d{2}\s?(AM|PM))/i,           // "3:00 PM", "3:30 am"
    /(\d{1,2}\s?(AM|PM))/i,                 // "3PM", "3 pm", "3 am"
    /(\d{1,2})\s?(?:o'clock|oclock)/i,      // "3 o'clock", "3oclock"
    /(\d{1,2})\s?(?:in the morning)/i,      // "9 in the morning"
    /(\d{1,2})\s?(?:in the afternoon)/i,    // "3 in the afternoon"
    /(\d{1,2})\s?(?:in the evening)/i,      // "6 in the evening"
    /(\d{1,2})\s?(?:at night)/i             // "8 at night"
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let timeStr = match[0];
      let hour = parseInt(match[1]);
      
      // Convert natural language to standard format
      if (timeStr.includes('morning') && hour >= 1 && hour <= 12) {
        return `${hour}:00 AM`;
      } else if (timeStr.includes('afternoon') && hour <= 12) {
        const adjustedHour = hour === 12 ? 12 : hour;
        return `${adjustedHour}:00 PM`;
      } else if (timeStr.includes('evening') && hour <= 12) {
        const adjustedHour = hour === 12 ? 12 : hour;
        return `${adjustedHour}:00 PM`;
      } else if (timeStr.includes('night') && hour <= 12) {
        const adjustedHour = hour === 12 ? 12 : hour;
        return `${adjustedHour}:00 PM`;
      } else if (timeStr.match(/\d{1,2}\s?(AM|PM)/i)) {
        // Handle "3PM" format
        const ampm = timeStr.toUpperCase().includes('AM') ? 'AM' : 'PM';
        return `${hour}:00 ${ampm}`;
      } else if (timeStr.includes(':')) {
        // Already in good format
        return match[0];
      }
    }
  }
  return null;
}

// Dedicated function to handle "busy" with comprehensive negation detection
function isBusyRejection(text: string): boolean {
  // Only treat "busy" as rejection if it's not negated
  const hasRawBusy = /\bbusy\b/i.test(text);
  if (!hasRawBusy) return false;

  // Check for negated auxiliary patterns before "busy"
  const negatedBusyPattern = /(?:won't|will not|shouldn't|should not|can't|cannot|couldn't|could not|wouldn't|would not|might not|isn't going to|not going to|am not|are not|is not|not)\s+(?:be\s+)?busy/i;

  // If we find negated busy patterns, this is NOT a rejection
  if (negatedBusyPattern.test(text)) return false;

  // If we have raw "busy" without negation, it's a rejection
  return true;
}

// Advanced email parsing from voice input with robust error handling
function parseEmailFromVoiceText(text: string): string | null {
  const original = text;
  let normalized = text.toLowerCase().trim();

  console.log(`[EMAIL PARSER] Input: "${text}"`);

  // Step 1: Check if it's already a valid typed email (bypass voice parsing)
  const directEmailMatch = normalized.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (directEmailMatch) {
    console.log(`[EMAIL PARSER] Direct email found: "${directEmailMatch[1]}"`);
    return directEmailMatch[1].toLowerCase();
  }

  // Step 2: Remove common prefixes
  normalized = normalized.replace(/^(my\s+email\s+(address\s+)?is\s+|email\s+is\s+|it'?s\s+|the\s+email\s+is\s+)/i, '');

  // Step 3: Identify and protect common email domains FIRST
  // This creates anchor points for reconstruction
  const domainMap = {
    'gmail': 'gmail.com',
    'geemail': 'gmail.com',
    'g mail': 'gmail.com',
    'yahoo': 'yahoo.com',
    'ya hoo': 'yahoo.com',
    'outlook': 'outlook.com',
    'hotmail': 'hotmail.com',
    'hot mail': 'hotmail.com',
    'icloud': 'icloud.com',
    'i cloud': 'icloud.com'
  };

  let detectedDomain: string | null = null;
  let beforeDomain = '';

  // Find which domain is mentioned
  for (const [key, value] of Object.entries(domainMap)) {
    // Match domain with optional "dot com" or "com" after it
    const domainPattern = new RegExp(`(.+?)\\s+(${key.replace(/\s/g, '\\s*')})\\s*(?:dot\\s+)?(?:com|org|net)?\\s*$`, 'i');
    const match = normalized.match(domainPattern);
    if (match) {
      beforeDomain = match[1];
      detectedDomain = value;
      console.log(`[EMAIL PARSER] Domain detected: ${detectedDomain}, before: "${beforeDomain}"`);
      break;
    }
  }

  if (!detectedDomain) {
    console.log('[EMAIL PARSER] No domain detected, cannot parse');
    return null;
  }

  // Step 4: Process the username part (everything before domain)
  let username = beforeDomain.trim();

  // Handle "at the rate" or "at" - these are delimiters, remove EVERYTHING after them
  // Match: "username at the rate" or "username at" or "username at something"
  username = username.replace(/\s+at\s+the\s+rate.*$/i, '');
  username = username.replace(/\s+at\s+.*$/i, ''); // Remove "at" and everything after

  // Remove common filler words that might be transcription errors
  username = username.replace(/\s+(the|a|an|and|or|to|of|in|on|three|four|five)\s+/gi, ' ');

  // Convert special characters
  username = username.replace(/\s+underscore\s+/g, '_');
  username = username.replace(/\s+(dash|hyphen)\s+/g, '-');
  username = username.replace(/\s+dot\s+/g, '.');
  username = username.replace(/\s+period\s+/g, '.');

  // Remove ALL remaining spaces
  username = username.replace(/\s+/g, '');

  // Remove any non-email characters
  username = username.replace(/[^a-z0-9._-]/g, '');

  if (username.length === 0) {
    console.log('[EMAIL PARSER] Username is empty after processing');
    return null;
  }

  const email = `${username}@${detectedDomain}`;
  console.log(`[EMAIL PARSER] Constructed email: "${email}"`);

  // Final validation
  if (isValidEmail(email)) {
    return email;
  }

  console.log('[EMAIL PARSER] Failed validation');
  return null;
}

// Validate email format and common domains
function isValidEmail(email: string): boolean {
  // RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for at least one character before @
  const [localPart, domainPart] = email.split('@');
  if (!localPart || localPart.length < 1) {
    return false;
  }

  // Check domain has at least one dot
  if (!domainPart || !domainPart.includes('.')) {
    return false;
  }

  // Check TLD is at least 2 characters
  const tld = domainPart.split('.').pop();
  if (!tld || tld.length < 2) {
    return false;
  }

  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Voice Agent endpoint (HTTP)
  app.post("/api/agent", async (req, res) => {
    try {
      const validatedData = voiceAgentRequestSchema.parse(req.body);
      const response = await processVoiceAgentRequest(validatedData);

      console.log(`HTTP Response sent:`, {
        replyText: response.replyText,
        askFor: response.askFor,
        readyToBook: response.readyToBook,
        hasAudio: !!response.audioUrl,
        sessionId: response.sessionState.sessionId
      });
      res.json(response);

    } catch (error) {
      console.error("Voice Agent Error:", error);
      const status = error instanceof Error && error.message.includes('validation') ? 400 : 500;
      res.status(status).json({
        error: status === 400 ? "Bad Request" : "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Booking endpoint 
  app.post("/api/book", async (req, res) => {
    try {
      const validatedData = bookingRequestSchema.parse(req.body);
      const { name, email } = validatedData;

      console.log(`Booking request - Name: [REDACTED], Email: [REDACTED]`);

      // Parse meeting time from session data
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let meetingTime = tomorrow;
      
      // Try to parse the selected time from request or find active session
      let selectedTime = validatedData.meetingTime;
      
      // If no time in request, find the session for this booking
      if (!selectedTime) {
        // Find session by name/email match (simplified lookup)
        for (const [sessionId, sess] of Array.from(sessions.entries())) {
          if (sess.collectedData.name === name && sess.collectedData.email === email && sess.collectedData.meetingPreference) {
            selectedTime = sess.collectedData.meetingPreference;
            break;
          }
        }
      }
      
      if (selectedTime) {
        const timeMatch = selectedTime.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3].toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          meetingTime.setHours(hours, minutes, 0, 0);
        } else {
          // Fallback to default time
          meetingTime.setHours(12, 30, 0, 0);
        }
      } else {
        // Default time
        meetingTime.setHours(12, 30, 0, 0);
      }
      
      // Save booking to database
      const booking = await storage.createBooking({
        name,
        email,
        meetingTime: meetingTime
      });

      const calendlyBaseLink = process.env.CALENDLY_BASE_LINK;
      if (!calendlyBaseLink) {
        throw new Error("CALENDLY_BASE_LINK environment variable not configured");
      }

      // Construct Calendly URL with pre-filled information including meeting time
      const separator = calendlyBaseLink.includes('?') ? '&' : '?';
      const formattedTime = selectedTime || meetingTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const calendlyUrl = `${calendlyBaseLink}${separator}name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&time=${encodeURIComponent(formattedTime)}`;

      const response: BookingResponse = {
        calendlyUrl
      };

      console.log(`Booking saved to database with ID: ${booking.id}`);
      console.log(`Calendly URL generated: ${calendlyUrl}`);
      res.json(response);

    } catch (error) {
      console.error("Booking Error:", error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Text-to-Speech endpoint using ElevenLabs
  app.post("/api/tts", async (req, res) => {
    try {
      const validatedData = ttsRequestSchema.parse(req.body);
      const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = validatedData; // Default to Rachel voice

      if (!ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY environment variable not configured");
      }

      console.log(`TTS request - Text length: ${text.length}, Voice ID: ${voiceId}`);

      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error: ${response.status} ${errorText}`);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      // Convert audio to base64 data URL for easy frontend consumption
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

      const ttsResponse: TTSResponse = {
        audioUrl: audioDataUrl
      };

      console.log(`TTS response generated successfully`);
      res.json(ttsResponse);

    } catch (error) {
      console.error("TTS Error:", error);
      const status = error instanceof Error && error.message.includes('validation') ? 400 : 500;
      res.status(status).json({ 
        error: status === 400 ? "Bad Request" : "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // AssemblyAI Token endpoint - generates temporary tokens for streaming
  app.post("/api/assemblyai/token", async (req, res) => {
    try {
      if (!assemblyAIClient) {
        throw new Error("AssemblyAI API key not configured");
      }

      console.log("Generating AssemblyAI temporary token");

      // Generate a temporary token for streaming (max 600 seconds = 10 minutes)
      const token = await assemblyAIClient.streaming.createTemporaryToken({
        expires_in_seconds: 600, // 10 minutes (maximum allowed)
      });

      console.log("AssemblyAI token generated successfully");
      res.json({
        token: token,
      });

    } catch (error) {
      console.error("AssemblyAI token generation error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup for real-time voice agent communication
  // Use a specific path to avoid conflicts with Vite's WebSocket
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/voice-ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`WebSocket message received: ${JSON.stringify(message)}`);

        if (message.type === 'voice_agent') {
          // Handle voice agent request via WebSocket
          const validatedData = voiceAgentRequestSchema.parse(message.data);
          const response = await processVoiceAgentRequest(validatedData);

          // Send response back via WebSocket
          console.log(`WebSocket Response sending:`, {
            type: 'voice_agent_response',
            replyText: response.replyText,
            askFor: response.askFor,
            readyToBook: response.readyToBook,
            hasAudio: !!response.audioUrl,
            messageId: message.messageId,
            sessionId: response.sessionState.sessionId
          });

          ws.send(JSON.stringify({
            type: 'voice_agent_response',
            data: response,
            messageId: message.messageId // Echo back message ID for client correlation
          }));

          console.log(`WebSocket Response sent successfully`);

        } else if (message.type === 'voice_agent_stream') {
          // Handle streaming voice agent request for audio chunks
          const validatedData = voiceAgentRequestSchema.parse(message.data);
          await handleStreamingVoiceAgent(ws, validatedData, message.messageId);

        } else if (message.type === 'ping') {
          // Handle ping for connection keep-alive
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));

        } else {
          console.warn(`Unknown WebSocket message type: ${message.type}`);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Unknown message type',
            messageId: message.messageId
          }));
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          messageId: 'unknown'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connected - real-time voice agent ready'
    }));
  });

  // Streaming voice agent handler for audio chunks
  async function handleStreamingVoiceAgent(ws: WebSocket, requestData: VoiceAgentRequest, messageId: string) {
    try {
      const { sessionId } = requestData;

      // Send immediate acknowledgment
      ws.send(JSON.stringify({
        type: 'voice_agent_stream_start',
        messageId,
        sessionId
      }));

      // Process the request but stream the TTS in chunks
      const response = await processVoiceAgentRequestStreaming(requestData, (chunk) => {
        // Send audio chunks as they're generated
        ws.send(JSON.stringify({
          type: 'audio_chunk',
          messageId,
          chunk,
          sessionId
        }));
      });

      // Send final response
      console.log(`WebSocket Streaming Response sending:`, {
        type: 'voice_agent_stream_complete',
        replyText: response.replyText,
        askFor: response.askFor,
        readyToBook: response.readyToBook,
        hasAudio: !!response.audioUrl,
        messageId
      });

      ws.send(JSON.stringify({
        type: 'voice_agent_stream_complete',
        messageId,
        data: response
      }));

      console.log(`WebSocket Streaming Response sent successfully`);

    } catch (error) {
      console.error('Streaming voice agent error:', error);
      ws.send(JSON.stringify({
        type: 'voice_agent_stream_error',
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  // Streaming version of voice agent processing for audio chunks
  async function processVoiceAgentRequestStreaming(
    requestData: VoiceAgentRequest,
    onAudioChunk: (chunk: string) => void
  ): Promise<VoiceAgentResponse> {
    // Use the regular processing but implement streaming TTS
    const { sessionId, text, final } = requestData;

    console.log(`Streaming Voice Agent - Session: ${sessionId}, Text length: ${text.length}, Final: ${final}`);

    // Get or create session (same logic as before)
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        messages: [{
          role: 'system',
          content: `You are SleeckOS Agent, a polite and helpful voice booking assistant. Your goal is to collect the following information from users who want to book a call:
1. Name (first and last name)
2. Email address
3. Meeting preference from available time slots

Instructions:
- Ask for ONE piece of information at a time
- Be conversational and friendly
- Keep responses short and natural for voice interaction
- After collecting name and email, I will provide you with a specific time slot to suggest to the user
- If user is not available for the suggested time, I will provide alternative slots
- If user rejects multiple options, ask for their preferred time
- When you have all information including confirmed meeting time, confirm everything with the user
- You MUST respond ONLY with a valid JSON object containing: {"replyText": "your response to user", "askFor": "name|email|meeting_preference|user_preferred_time|confirmation|null", "readyToBook": false/true}
- Set readyToBook to true only after user confirms all information is correct
- Use "askFor" values: "name", "email", "meeting_preference", "user_preferred_time", "confirmation", or null when done
- If the user provides multiple pieces of info at once, acknowledge all but focus on the first missing piece

Start by greeting the user and asking for their name. Remember: respond ONLY with valid JSON.`
        }],
        collectedData: {
          rejectedSlots: [] as string[],
          lastSuggestedSlot: undefined
        },
        lastUpdated: new Date()
      };
      sessions.set(sessionId, session);
    }

    // Add user message if final
    if (final && text.trim()) {
      session.messages.push({ role: 'user', content: text });
      session.lastUpdated = new Date();
    }

    // Handle time slot logic (same as before)
    const messagesWithContext = [...session.messages];

    if (session.collectedData.name && session.collectedData.email && !session.collectedData.meetingPreference && !session.collectedData.userPreferredTime) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const availableSlots = await storage.getAvailableTimeSlots(tomorrow);
      const rejectedSlots = session.collectedData.rejectedSlots || [];
      const nonRejectedSlots = availableSlots.filter(slot => !rejectedSlots.includes(slot));

      if (nonRejectedSlots.length === 0) {
        messagesWithContext.push({
          role: 'system',
          content: `No more available slots. Ask the user what time they prefer for tomorrow and note that you'll check availability.`
        });
      } else if (rejectedSlots.length >= 2) {
        messagesWithContext.push({
          role: 'system',
          content: `User has rejected multiple suggestions. Ask them what time they prefer for tomorrow. Available slots are: ${nonRejectedSlots.join(', ')}.`
        });
      } else {
        const randomSlot = nonRejectedSlots[Math.floor(Math.random() * nonRejectedSlots.length)];
        session.collectedData.lastSuggestedSlot = randomSlot;
        messagesWithContext.push({
          role: 'system',
          content: `Suggest this specific time slot: ${randomSlot}. Ask if this time works for them.`
        });
      }
    }

    // Call LLM (Groq primary, OpenAI fallback)
    const llmResponse = await createChatCompletion(messagesWithContext, true);
    const assistantMessage = llmResponse.content;

    if (!assistantMessage) {
      throw new Error(`No response from LLM provider (${llmResponse.provider})`);
    }

    console.log(`Streaming LLM Response from ${llmResponse.provider}:`);
    console.log("Raw streaming response:", assistantMessage);

    let parsedResponse: {replyText: string, askFor: string | null, readyToBook?: boolean};
    try {
      parsedResponse = JSON.parse(assistantMessage);
      console.log("Parsed streaming response:", parsedResponse);

      if (!parsedResponse.replyText) {
        console.error("Invalid streaming response structure:", parsedResponse);
        throw new Error("Invalid response format from LLM");
      }

      // Set default value for readyToBook if not provided
      if (typeof parsedResponse.readyToBook !== 'boolean') {
        parsedResponse.readyToBook = false;
      }
    } catch (error) {
      console.error("Failed to parse streaming JSON response from LLM:", error);
      console.error("Raw streaming response that failed to parse:", assistantMessage);

      // Try to extract a basic response if JSON parsing fails
      const fallbackResponse = {
        replyText: assistantMessage.includes('{') ? "I'm having trouble processing that. Could you please repeat?" : assistantMessage,
        askFor: null,
        readyToBook: false
      };
      console.log("Using fallback streaming response:", fallbackResponse);
      parsedResponse = fallbackResponse;
    }

    // Extract collected data (same logic as main function)
    if (text.trim()) {
      if (parsedResponse.askFor === "email" && !session.collectedData.name) {
        const nameMatch = text.match(/(?:my name is |i'm |i am |call me )([a-zA-Z\s]+)/i);
        session.collectedData.name = nameMatch ? nameMatch[1].trim() : text.trim();
      }
      else if ((parsedResponse.askFor === "meeting_preference" || parsedResponse.askFor === "email") && !session.collectedData.email) {
        const extractedEmail = parseEmailFromVoiceText(text);
        if (extractedEmail && isValidEmail(extractedEmail)) {
          session.collectedData.email = extractedEmail;
        }
      }
      // Additional logic shortened for brevity - same as the main function
    }

    session.messages.push({ role: 'assistant', content: assistantMessage });

    // Generate streaming TTS
    let audioUrl: string | undefined;
    if (parsedResponse.replyText && ELEVENLABS_API_KEY) {
      try {
        console.log(`Generating streaming TTS for: ${parsedResponse.replyText.substring(0, 50)}...`);

        // For now, we'll simulate streaming by chunking the text
        // In a real implementation, you'd use a streaming TTS API
        const words = parsedResponse.replyText.split(' ');
        const chunkSize = Math.max(3, Math.floor(words.length / 4)); // Split into ~4 chunks

        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(i, i + chunkSize).join(' ');
          if (chunk.trim()) {
            const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
              method: 'POST',
              headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
              },
              body: JSON.stringify({
                text: chunk,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.5,
                },
              }),
            });

            if (ttsResponse.ok) {
              const audioBuffer = await ttsResponse.arrayBuffer();
              const audioBase64 = Buffer.from(audioBuffer).toString('base64');
              const chunkAudioUrl = `data:audio/mpeg;base64,${audioBase64}`;

              // Send this chunk via callback
              onAudioChunk(chunkAudioUrl);

              // Also store for fallback
              if (!audioUrl) audioUrl = chunkAudioUrl;
            }
          }
        }

        console.log(`Streaming TTS completed`);
      } catch (error) {
        console.error('Streaming TTS generation error:', error);
      }
    }

    const finalStreamingResponse = {
      replyText: parsedResponse.replyText,
      askFor: parsedResponse.askFor,
      readyToBook: parsedResponse.readyToBook ?? false,
      sessionState: {
        collectedData: session.collectedData,
        sessionId: session.sessionId
      },
      audioUrl
    };

    console.log("Final streaming voice agent response:", {
      replyText: finalStreamingResponse.replyText,
      askFor: finalStreamingResponse.askFor,
      readyToBook: finalStreamingResponse.readyToBook,
      hasAudio: !!finalStreamingResponse.audioUrl
    });

    return finalStreamingResponse;
  }

  return httpServer;
}
