import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

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
      description: "The cryptocurrency token symbol. Must be one of: ETH, USDC, USDT, SOL.",
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
      const parsedData = ruleBasedFallbackParser(prompt);
      return NextResponse.json({ data: parsedData, mock: true });
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
      "Extract the name of the receiver. Token must be mapped to one of the following: ETH, USDC, USDT, SOL. If undefined, default to ETH. " +
      "Ensure numbers are parsed as float values.";

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: `Parse the following payment instruction: "${prompt}"` }
    ]);

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({ data: parsedData, mock: false });
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
function ruleBasedFallbackParser(prompt: string) {
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
  else if (text.includes("sol")) token = "SOL";

  // Attempt to extract receiver name
  // E.g. "Pay Rahul 10 USDC..." or "Send 50 USDC to Alice..."
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

  // Clean name from stopwords like "amount", "token name", etc.
  const excludeWords = ["usdc", "usdt", "eth", "sol", "recurring", "scheduled", "conditional"];
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
  if (text.includes("recurring") || text.includes("every month") || text.includes("monthly")) {
    type = "recurring";
  } else if (text.includes("schedule") || text.includes("delayed") || text.includes("on september") || text.includes("on the")) {
    type = "scheduled";
  }

  // Extract condition after "after", "if", "when", "on"
  let condition = `Released automatically once conditions are met: "${prompt}"`;
  const conditionMatch = prompt.match(/(?:after|if|when|on)\s+(.+)/i);
  if (conditionMatch) {
    condition = "Release when " + conditionMatch[1].trim();
  }

  return {
    receiverName,
    receiverAddress: receiverAddress || "0x71C272765B20a800000000000000000000000000", // default mock if empty
    amount,
    token,
    type,
    condition,
    description: `AI parsed escrow for ${receiverName}`,
  };
}
