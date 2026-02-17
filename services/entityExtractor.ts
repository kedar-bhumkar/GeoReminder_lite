import OpenAI from 'openai';
import { getApiKey } from './config';
import { appConfig } from '../config/appConfig';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set your API key in settings.');
    }
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for web/React Native
    });
  }
  return openaiClient;
}

export function resetOpenAIClient(): void {
  openaiClient = null;
}

export interface EntityExtractionResult {
  entities: string[]; // Array of extracted entities
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export async function extractEntitiesFromReminder(reminderText: string): Promise<EntityExtractionResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('No OpenAI API key configured, skipping entity extraction');
    return { entities: [], confidence: 'none' };
  }

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: appConfig.openaiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an entity extractor. Given a reminder text, extract ALL business names, store names, or location entities that the user wants to be reminded about when they visit.

Rules:
- Extract ALL relevant business/location entities mentioned (can be multiple)
- Return entity names in standardized format (proper capitalization)
- If no clear business/location entities are found, return an empty array
- Common entities include: stores (Target, Costco, Walmart), restaurants, gyms, offices, pharmacies, banks, etc.
- Do NOT extract general locations like "home" or "work" unless they are specific business names
- Extract each entity only once (no duplicates)

Examples:
- "Buy milk at Costco and pick up prescription from CVS" → ["Costco", "CVS"]
- "Get groceries from Trader Joe's, then coffee at Starbucks" → ["Trader Joe's", "Starbucks"]
- "Remind me to buy coconuts when at Target" → ["Target"]
- "Go to the gym and then the bank" → [] (too generic, no specific business names)
- "Go to Planet Fitness and then Chase Bank" → ["Planet Fitness", "Chase Bank"]

Respond in JSON format only:
{"entities": ["Entity1", "Entity2", ...] or [], "confidence": "high" | "medium" | "low"}`
        },
        {
          role: 'user',
          content: reminderText
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return { entities: [], confidence: 'none' };
    }

    const parsed = JSON.parse(content);
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      confidence: parsed.confidence || 'none'
    };
  } catch (error) {
    console.error('Entity extraction failed:', error);
    return { entities: [], confidence: 'none' };
  }
}

// Helper to convert entities array to semicolon-separated string for storage
export function entitiesToString(entities: string[]): string {
  return entities.filter(e => e.trim()).join(';');
}

// Helper to convert semicolon-separated string to entities array
export function stringToEntities(entityString: string | null): string[] {
  if (!entityString) return [];
  return entityString.split(';').map(e => e.trim()).filter(e => e);
}
