// App configuration with predefined values
// These can be overridden by user settings

export const appConfig = {
  // Predefined OpenAI API key (optional)
  // Set this to provide a default key for the app
  // Users can override this in Settings
  openaiApiKey: '', // Set your OpenAI API key here or in Settings

  // OpenAI model to use for entity extraction
  openaiModel: 'gpt-4o-mini',

  // Predefined Google Places API key (optional)
  // Set this to provide a default key for the app
  // Users can override this in Settings
  googlePlacesApiKey: '', // Set your Google Places API key here or in Settings

  // Location tracking defaults
  locationCheckIntervalMinutes: 1,
  locationRadiusMeters: 152, // 500 feet in meters
};
