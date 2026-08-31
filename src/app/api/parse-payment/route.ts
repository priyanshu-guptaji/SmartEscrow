import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";

const VALID_TOKENS = ["ETH", "USDC", "USDT"] as const;
const VALID_TYPES = ["conditional", "scheduled", "recurring"] as const;
const VALID_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const VALID_ENS_REGEX = /^[a-zA-Z0-9-]+\.eth$/;

// Zod schema for strict server-side validation of AI/rule-based parser output
const ParsedPaymentSchema = z.object({
  receiverName: z.string().trim().min(1, "Receiver name is required").max(100),
  receiverAddress: z.string().default(""),
  amount: z.number().positive("Amount must be positive").max(1_000_000, "Amount exceeds maximum"),
  token: z.string().transform((t) => t.toUpperCase()).pipe(z.enum(VALID_TOKENS)),
  type: z.string().transform((t) => t.toLowerCase()).pipe(z.enum(VALID_TYPES)),
  condition: z.string().trim().min(1).max(500).default("Release when conditions are met."),
  description: z.string().trim().max(200).optional(),
  scheduledAt: z.string().optional(),
  frequency: z.string().optional(),
});

type ParsedPayment = z.infer<typeof ParsedPaymentSchema>;

// Schema definition for Gemini response schema validation
const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    receiverName: {
      type: SchemaType.STRING,
      description: "Name or alias of the receiver (e.g., Alice Vance, Bob, Rahul)",
    },
    receiverAddress: {
      type: SchemaType.STRING,
      description: "Cryptographic wallet address of the receiver if specified in the text (e.g., 0x...), otherwise empty string.",
    },
    amount: {
      type: SchemaType.NUMBER,
      description: "The numeric amount of cryptocurrency to transfer.",
    },
    token: {
      type: SchemaType.STRING,
      description: "The cryptocurrency token symbol. Must be one of: ETH, USDC, USDT.",
    },
    type: {
      type: SchemaType.STRING,
      description: "The type of payment agreement: 'conditional' (milestones/events), 'scheduled' (delay/future date), or 'recurring' (periodic payments).",
    },
    condition: {
      type: SchemaType.STRING,
      description: "A detailed summary description of the release logic or condition triggers (e.g., 'Release when portfolio website matches Figma spec').",
    },
    description: {
      type: SchemaType.STRING,
      description: "A brief project reference description or memo (e.g. 'Frontend milestone escrow').",
    },
  },
  required: ["receiverName", "amount", "token", "type", "condition"],
};

function validateParsedData(data: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
} {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  // Receiver name
  if (!data.receiverName || typeof data.receiverName !== "string" || data.receiverName.trim().length === 0) {
    errors.push("Receiver name is required");
    sanitized.receiverName = "Recipient";
  } else {
    sanitized.receiverName = data.receiverName.trim().slice(0, 100);
  }

  // Receiver address - validate format if provided
  const addr = data.receiverAddress;
  if (addr && typeof addr === "string" && addr.length > 0) {
    if (VALID_ADDRESS_REGEX.test(addr)) {
      sanitized.receiverAddress = addr;
    } else if (VALID_ENS_REGEX.test(addr)) {
      // ENS name - will be resolved client-side
      sanitized.receiverAddress = addr;
    } else {
      errors.push("Invalid wallet address format. Must be 0x... (42 chars) or ENS name.");
      sanitized.receiverAddress = "";
    }
  } else {
    sanitized.receiverAddress = "";
  }

  // Amount
  const amount = Number(data.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push("Amount must be a positive number");
    sanitized.amount = 1.0;
  } else if (amount > 1_000_000) {
    errors.push("Amount exceeds maximum allowed (1,000,000)");
    sanitized.amount = 1_000_000;
  } else {
    sanitized.amount = amount;
  }

  // Token
  const token = typeof data.token === "string" ? data.token.toUpperCase() : "ETH";
  if (!VALID_TOKENS.includes(token as typeof VALID_TOKENS[number])) {
    errors.push(`Invalid token "${data.token}". Must be ETH, USDC, or USDT.`);
    sanitized.token = "ETH";
  } else {
    sanitized.token = token;
  }

  // Type
  const type = typeof data.type === "string" ? data.type.toLowerCase() : "conditional";
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    errors.push(`Invalid payment type "${data.type}". Must be conditional, scheduled, or recurring.`);
    sanitized.type = "conditional";
  } else {
    sanitized.type = type;
  }

  // Condition
  if (!data.condition || typeof data.condition !== "string" || data.condition.trim().length === 0) {
    sanitized.condition = "Release when conditions are met.";
  } else {
    sanitized.condition = data.condition.trim().slice(0, 500);
  }

  // Description
  sanitized.description = typeof data.description === "string"
    ? data.description.trim().slice(0, 200)
    : `Payment escrow for ${sanitized.receiverName}`;

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate sanitized output through Zod as a second validation pass.
 * This ensures the output schema is strictly enforced even if the manual
 * validator above has edge cases.
 */
function zodValidate(sanitized: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  data: ParsedPayment | null;
} {
  try {
    const result = ParsedPaymentSchema.parse(sanitized);
    return { valid: true, errors: [], data: result };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        valid: false,
        errors: err.issues.map((i) => i.message),
        data: null,
      };
    }
    return { valid: false, errors: ["Validation failed"], data: null };
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Invalid prompt. A string prompt is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured. Falling back to rule-based parser.");
      const rawParsedData = ruleBasedFallbackParser(prompt);
      const { sanitized } = validateParsedData(rawParsedData);
      return NextResponse.json({ data: sanitized, mock: true });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-1.5-flash as the standard reliable, fast model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const systemInstruction = 
      "You are a parser assistant for SmartEscrow. Your job is to extract structured escrow details from natural language payment instructions. " +
      "If a wallet address (0x...) is not specified, return an empty string for receiverAddress. If the receiver address is specified as an ENS name (e.g. name.eth), extract it as receiverAddress. " +
      "Extract the name of the receiver. Token must be mapped to one of the following: ETH, USDC, USDT. If undefined, default to ETH. " +
      "Ensure numbers are parsed as float values.";

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: `Parse the following payment instruction: "${prompt}"` }
    ]);

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    // First pass: manual validation and sanitization
    const { valid, errors, sanitized } = validateParsedData(parsedData);

    // Second pass: Zod schema enforcement
    const zodResult = zodValidate(sanitized);

    // Use Zod-validated data if available; fall back to sanitized data
    const finalData = zodResult.valid && zodResult.data
      ? { ...zodResult.data, description: zodResult.data.description || `Payment escrow for ${zodResult.data.receiverName}` }
      : sanitized;

    const allErrors = [...errors, ...zodResult.errors];

    return NextResponse.json({
      data: finalData,
      mock: false,
      validationErrors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gemini AI Parsing Error:", error);
    return NextResponse.json(
      { error: "Failed to parse natural language terms: " + message },
      { status: 500 }
    );
  }
}

// Robust fallback parser when no API key is set
function ruleBasedFallbackParser(prompt: string): Record<string, unknown> {
  const text = prompt.toLowerCase();
  
  // Basic heuristics
  let amount = 1.0;
  const amountMatch = prompt.match(/\d+(\.\d+)?/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[0]);
  }

  let token = "ETH";
  if (text.includes("usdc")) token = "USDC";
  else if (text.includes("usdt")) token = "USDT";

  // Attempt to extract receiver name
  let receiverName = "Recipient";
  const payMatch = prompt.match(/pay\s+([A-Za-z]+(\s+[A-Za-z]+)?)/i);
  const sendToMatch = prompt.match(/send.*?to\s+([A-Za-z]+(\s+[A-Za-z]+)?)/i);
  const escrowForMatch = prompt.match(/escrow.*?(?:for|to)\s+([A-Za-z]+(\s+[A-Za-z]+)?)/i);

  if (payMatch) {
    receiverName = payMatch[1].trim();
  } else if (sendToMatch) {
    receiverName = sendToMatch[1].trim();
  } else if (escrowForMatch) {
    receiverName = escrowForMatch[1].trim();
  }

  // Clean name from stopwords
  const excludeWords = ["usdc", "usdt", "eth", "recurring", "scheduled", "conditional"];
  excludeWords.forEach(word => {
    if (receiverName.toLowerCase().endsWith(" " + word)) {
      receiverName = receiverName.substring(0, receiverName.length - word.length - 1);
    }
  });

  // Extract address if matches 0x...
  let receiverAddress = "";
  const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    receiverAddress = addressMatch[0];
  } else if (prompt.includes(".eth")) {
    const ensMatch = prompt.match(/[a-zA-Z0-9-]+\.eth/);
    if (ensMatch) {
      receiverAddress = ensMatch[0];
    }
  }

  // Type selection
  let type = "conditional";
  let scheduledAt: string | undefined;
  let frequency: string | undefined;

  if (text.includes("recurring") || text.includes("every month") || text.includes("monthly") || text.includes("every ") || /\bevery\s+\d+\s+(day|week|month)/.test(text)) {
    type = "recurring";
    if (text.includes("every month") || text.includes("monthly")) frequency = "monthly";
    else if (text.includes("every week") || text.includes("weekly")) frequency = "weekly";
    else if (text.includes("every day") || text.includes("daily")) frequency = "daily";
    else if (/every\s+\d+\s+day/.test(text)) frequency = "daily";
    else if (/every\s+\d+\s+week/.test(text)) frequency = "weekly";
    else if (/every\s+\d+\s+month/.test(text)) frequency = "monthly";
    else frequency = "monthly";
  } else if (text.includes("schedule") || text.includes("delayed") || text.includes("on september") || text.includes("on the")) {
    type = "scheduled";
    // Try to extract a date
    const dateMatch = prompt.match(/(?:on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
    if (dateMatch) {
      const month = dateMatch[1];
      const day = dateMatch[2];
      const year = dateMatch[3] || "2026";
      const monthNum = new Date(`${month} 1, 2000`).getMonth();
      scheduledAt = new Date(parseInt(year), monthNum, parseInt(day), 12, 0, 0).toISOString();
    }
  }

  // Extract condition
  let condition = `Released automatically once conditions are met: "${prompt}"`;
  const conditionMatch = prompt.match(/(?:after|if|when|on)\s+(.+)/i);
  if (conditionMatch) {
    condition = "Release when " + conditionMatch[1].trim();
  }

  return {
    receiverName,
    receiverAddress,
    amount,
    token,
    type,
    condition,
    description: `AI parsed escrow for ${receiverName}`,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(frequency ? { frequency } : {}),
  };
}
