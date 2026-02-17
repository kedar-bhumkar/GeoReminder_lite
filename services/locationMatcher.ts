import OpenAI from 'openai';
import { getApiKey } from './config';
import { appConfig } from '../config/appConfig';
import { Reminder } from '../types';
import { NearbyPlace } from './placesService';
import { stringToEntities } from './entityExtractor';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
  return openaiClient;
}

export function resetMatcherClient(): void {
  openaiClient = null;
}

export interface MatchResult {
  reminderId: number;
  reminderText: string;
  matchedEntity: string;
  matchedPlace: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface LocationMatchResult {
  matches: MatchResult[];
  placesChecked: string[];
  error?: string;
}

export async function findMatchingReminders(
  places: NearbyPlace[],
  reminders: Reminder[]
): Promise<LocationMatchResult> {
  const apiKey = getApiKey();

  // Filter to only active reminders with entities
  const activeReminders = reminders.filter(r => r.is_active && r.entity);

  if (activeReminders.length === 0) {
    return { matches: [], placesChecked: places.map(p => p.name) };
  }

  if (places.length === 0) {
    return { matches: [], placesChecked: [] };
  }

  if (!apiKey) {
    console.warn('No OpenAI API key configured, skipping location matching');
    return { matches: [], placesChecked: places.map(p => p.name), error: 'No API key' };
  }

  // Prepare data for LLM
  const placeNames = places.map(p => p.name).filter(n => n.length > 0);
  const reminderData = activeReminders.map(r => ({
    id: r.id,
    text: r.text,
    entities: stringToEntities(r.entity),
  }));

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: appConfig.openaiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a location-reminder matcher. Given a list of nearby places/locations and reminders with their entities, determine which reminders should be triggered based on location matches.

Rules:
- Match place names, street names, or addresses to reminder entity names (fuzzy matching allowed)
- Business matching: "Target Store #1234" matches "Target", "Starbucks Reserve" matches "Starbucks"
- Street matching: "Oak Street" matches "Oak St", "Main Avenue" matches "Main Ave"
- Address matching: "123 Main St" in nearby location matches entity "123 Main Street"
- Neighborhood matching: If entity mentions a neighborhood name, match it
- Case-insensitive matching
- Return confidence levels:
  - "high": Exact or near-exact match
  - "medium": Likely match with some variation
  - "low": Possible but uncertain match
- Only return matches, not non-matches
- Each reminder should only appear once in the results (use highest confidence match)

Respond with JSON only:
{
  "matches": [
    {"reminderId": number, "matchedEntity": "string", "matchedPlace": "string", "confidence": "high"|"medium"|"low"}
  ]
}`
        },
        {
          role: 'user',
          content: JSON.stringify({
            nearbyPlaces: placeNames,
            reminders: reminderData,
          })
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return { matches: [], placesChecked: placeNames };
    }

    const parsed = JSON.parse(content);
    const llmMatches = Array.isArray(parsed.matches) ? parsed.matches : [];

    // Enrich matches with reminder text
    const matches: MatchResult[] = llmMatches
      .map((match: any) => {
        const reminder = activeReminders.find(r => r.id === match.reminderId);
        if (!reminder) return null;
        return {
          reminderId: match.reminderId,
          reminderText: reminder.text,
          matchedEntity: match.matchedEntity || '',
          matchedPlace: match.matchedPlace || '',
          confidence: match.confidence || 'low',
        };
      })
      .filter((m): m is MatchResult => m !== null);

    return { matches, placesChecked: placeNames };
  } catch (error) {
    console.error('Location matching failed:', error);
    return {
      matches: [],
      placesChecked: placeNames,
      error: error instanceof Error ? error.message : 'Matching failed',
    };
  }
}

// Simple string-based matching as fallback (no LLM needed)
export function findMatchingRemindersSimple(
  placeNames: string[],
  reminders: Reminder[]
): MatchResult[] {
  const activeReminders = reminders.filter(r => r.is_active && r.entity);
  const matches: MatchResult[] = [];
  const normalizedPlaces = placeNames.map(p => p.toLowerCase());

  for (const reminder of activeReminders) {
    const entities = stringToEntities(reminder.entity);

    for (const entity of entities) {
      const normalizedEntity = entity.toLowerCase();

      for (let i = 0; i < normalizedPlaces.length; i++) {
        const placeName = normalizedPlaces[i];

        // Check if place contains entity or vice versa
        if (placeName.includes(normalizedEntity) || normalizedEntity.includes(placeName)) {
          matches.push({
            reminderId: reminder.id,
            reminderText: reminder.text,
            matchedEntity: entity,
            matchedPlace: placeNames[i],
            confidence: placeName === normalizedEntity ? 'high' : 'medium',
          });
          break; // Only one match per reminder
        }
      }
    }
  }

  return matches;
}
