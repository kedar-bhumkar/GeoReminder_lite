import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, HelperText, Snackbar, ActivityIndicator, Card, RadioButton, Divider, Switch, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  loadApiKey,
  isUsingCustomKey,
  hasPredefinedKey,
  getPredefinedKeyMasked,
  usePredefinedKey,
} from '../services/config';
import {
  setPlacesApiKey,
  clearPlacesApiKey,
  loadPlacesApiKey,
  isUsingCustomPlacesKey,
  hasPredefinedPlacesKey,
  getPredefinedPlacesKeyMasked,
  usePredefinedPlacesKey,
  hasPlacesApiKey,
} from '../services/placesConfig';
import { useLocation } from '../contexts/LocationContext';
import { resetOpenAIClient } from '../services/entityExtractor';
import { resetMatcherClient } from '../services/locationMatcher';

type KeySource = 'predefined' | 'custom' | 'none';

const INTERVAL_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    isTracking,
    isBackgroundTracking,
    lastCheckTime,
    settings: locationSettings,
    permissionStatus,
    backgroundPermissionStatus,
    isChecking,
    error: locationError,
    startTracking,
    stopTracking,
    startBackgroundTracking,
    stopBackgroundTracking,
    updateSettings,
    checkNow,
    requestPermission,
    requestBackgroundPermission,
  } = useLocation();

  // OpenAI API Key state
  const [customApiKey, setCustomApiKey] = useState('');
  const [keySource, setKeySource] = useState<KeySource>('none');
  const [isEditingCustomKey, setIsEditingCustomKey] = useState(false);

  // Google Places API Key state
  const [customPlacesKey, setCustomPlacesKey] = useState('');
  const [placesKeySource, setPlacesKeySource] = useState<KeySource>('none');
  const [isEditingPlacesKey, setIsEditingPlacesKey] = useState(false);

  // Common state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const predefinedKeyExists = hasPredefinedKey();
  const predefinedKeyMasked = getPredefinedKeyMasked();
  const predefinedPlacesKeyExists = hasPredefinedPlacesKey();
  const predefinedPlacesKeyMasked = getPredefinedPlacesKeyMasked();

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      await loadApiKey();
      await loadPlacesApiKey();

      // OpenAI key source
      if (isUsingCustomKey()) {
        setKeySource('custom');
        setCustomApiKey('sk-••••••••••••••••••••••••••••••••');
      } else if (predefinedKeyExists) {
        setKeySource('predefined');
      } else {
        setKeySource('none');
      }

      // Places key source
      if (isUsingCustomPlacesKey()) {
        setPlacesKeySource('custom');
        setCustomPlacesKey('AIza••••••••••••••••••••••••••••');
      } else if (predefinedPlacesKeyExists) {
        setPlacesKeySource('predefined');
      } else {
        setPlacesKeySource('none');
      }

      setIsLoading(false);
    };
    loadSettings();
  }, []);

  // OpenAI Key handlers
  const handleSaveCustomKey = async () => {
    if (!customApiKey.trim() || customApiKey.includes('••••')) {
      setSnackbarMessage('Please enter a valid API key');
      setShowSnackbar(true);
      return;
    }

    setIsSaving(true);
    try {
      await setApiKey(customApiKey.trim());
      resetOpenAIClient();
      resetMatcherClient();
      setKeySource('custom');
      setCustomApiKey('sk-••••••••••••••••••••••••••••••••');
      setIsEditingCustomKey(false);
      setSnackbarMessage('OpenAI API key saved');
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Failed to save API key');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsePredefined = async () => {
    setIsSaving(true);
    try {
      await usePredefinedKey();
      resetOpenAIClient();
      resetMatcherClient();
      setKeySource('predefined');
      setCustomApiKey('');
      setIsEditingCustomKey(false);
      setSnackbarMessage('Switched to predefined key');
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Failed to switch key');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    await clearApiKey();
    resetOpenAIClient();
    resetMatcherClient();
    setKeySource(predefinedKeyExists ? 'predefined' : 'none');
    setCustomApiKey('');
    setIsEditingCustomKey(false);
    setSnackbarMessage('Custom key removed');
    setShowSnackbar(true);
  };

  // Places Key handlers
  const handleSavePlacesKey = async () => {
    if (!customPlacesKey.trim() || customPlacesKey.includes('••••')) {
      setSnackbarMessage('Please enter a valid Places API key');
      setShowSnackbar(true);
      return;
    }

    setIsSaving(true);
    try {
      await setPlacesApiKey(customPlacesKey.trim());
      setPlacesKeySource('custom');
      setCustomPlacesKey('AIza••••••••••••••••••••••••••••');
      setIsEditingPlacesKey(false);
      setSnackbarMessage('Google Places API key saved');
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Failed to save Places API key');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsePredefinedPlaces = async () => {
    setIsSaving(true);
    try {
      await usePredefinedPlacesKey();
      setPlacesKeySource('predefined');
      setCustomPlacesKey('');
      setIsEditingPlacesKey(false);
      setSnackbarMessage('Switched to predefined Places key');
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Failed to switch key');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPlacesKey = async () => {
    await clearPlacesApiKey();
    setPlacesKeySource(predefinedPlacesKeyExists ? 'predefined' : 'none');
    setCustomPlacesKey('');
    setIsEditingPlacesKey(false);
    setSnackbarMessage('Custom Places key removed');
    setShowSnackbar(true);
  };

  // Location tracking handlers
  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
      setSnackbarMessage('Location tracking disabled');
    } else {
      const success = await startTracking();
      if (success) {
        setSnackbarMessage('Location tracking enabled');
      } else {
        setSnackbarMessage('Failed to enable tracking - check permissions');
      }
    }
    setShowSnackbar(true);
  };

  const handleToggleBackgroundTracking = async () => {
    if (isBackgroundTracking) {
      await stopBackgroundTracking();
      setSnackbarMessage('Background tracking disabled');
    } else {
      const success = await startBackgroundTracking();
      if (success) {
        setSnackbarMessage('Background tracking enabled');
      } else {
        setSnackbarMessage('Failed to enable background tracking - grant "Always allow" location permission');
      }
    }
    setShowSnackbar(true);
  };

  const handleIntervalChange = async (value: string) => {
    await updateSettings({ intervalMinutes: parseInt(value, 10) });
    setSnackbarMessage(`Check interval updated to ${value} minutes`);
    setShowSnackbar(true);
  };

  const handleCheckNow = async () => {
    await checkNow();
    if (!locationError) {
      setSnackbarMessage('Location check completed');
      setShowSnackbar(true);
    }
  };

  const handleRequestPermission = async () => {
    const status = await requestPermission();
    setSnackbarMessage(`Location permission: ${status}`);
    setShowSnackbar(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const hasEffectiveKey = keySource !== 'none';
  const hasEffectivePlacesKey = placesKeySource !== 'none';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* OpenAI API Key Section */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          OpenAI API Key
        </Text>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Required for entity extraction and location matching.
        </Text>

        {predefinedKeyExists && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.radioRow}>
                <RadioButton
                  value="predefined"
                  status={keySource === 'predefined' ? 'checked' : 'unchecked'}
                  onPress={handleUsePredefined}
                  disabled={isSaving}
                />
                <View style={styles.radioContent}>
                  <Text variant="titleMedium">Use Predefined Key</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {predefinedKeyMasked}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.radioRow}>
              <RadioButton
                value="custom"
                status={keySource === 'custom' || isEditingCustomKey ? 'checked' : 'unchecked'}
                onPress={() => setIsEditingCustomKey(true)}
                disabled={isSaving}
              />
              <View style={styles.radioContent}>
                <Text variant="titleMedium">Use Custom Key</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Enter your own OpenAI API key
                </Text>
              </View>
            </View>

            {(keySource === 'custom' || isEditingCustomKey) && (
              <View style={styles.customKeySection}>
                <Divider style={styles.divider} />
                <TextInput
                  mode="outlined"
                  label="API Key"
                  placeholder="sk-..."
                  value={customApiKey}
                  onChangeText={setCustomApiKey}
                  secureTextEntry={!customApiKey.includes('••••') && customApiKey.length > 0}
                  disabled={isSaving || (keySource === 'custom' && !isEditingCustomKey)}
                  style={styles.input}
                  left={<TextInput.Icon icon="key" />}
                />
                <View style={styles.buttonRow}>
                  {isEditingCustomKey ? (
                    <>
                      <Button mode="outlined" onPress={() => { setIsEditingCustomKey(false); setCustomApiKey(keySource === 'custom' ? 'sk-••••••••••••••••••••••••••••••••' : ''); }} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button mode="contained" onPress={handleSaveCustomKey} loading={isSaving} disabled={isSaving || !customApiKey.trim() || customApiKey.includes('••••')}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button mode="outlined" onPress={() => { setCustomApiKey(''); setIsEditingCustomKey(true); }} disabled={isSaving}>
                        Change Key
                      </Button>
                      <Button mode="outlined" onPress={handleClearKey} textColor={theme.colors.error} disabled={isSaving}>
                        Remove
                      </Button>
                    </>
                  )}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Google Places API Key Section */}
        <Text variant="headlineSmall" style={[styles.sectionTitle, { marginTop: 24 }]}>
          Google Places API Key
        </Text>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Required for fetching nearby places for location matching.
        </Text>

        {predefinedPlacesKeyExists && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.radioRow}>
                <RadioButton
                  value="predefined"
                  status={placesKeySource === 'predefined' ? 'checked' : 'unchecked'}
                  onPress={handleUsePredefinedPlaces}
                  disabled={isSaving}
                />
                <View style={styles.radioContent}>
                  <Text variant="titleMedium">Use Predefined Key</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {predefinedPlacesKeyMasked}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.radioRow}>
              <RadioButton
                value="custom"
                status={placesKeySource === 'custom' || isEditingPlacesKey ? 'checked' : 'unchecked'}
                onPress={() => setIsEditingPlacesKey(true)}
                disabled={isSaving}
              />
              <View style={styles.radioContent}>
                <Text variant="titleMedium">Use Custom Key</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Enter your Google Places API key
                </Text>
              </View>
            </View>

            {(placesKeySource === 'custom' || isEditingPlacesKey) && (
              <View style={styles.customKeySection}>
                <Divider style={styles.divider} />
                <TextInput
                  mode="outlined"
                  label="Places API Key"
                  placeholder="AIza..."
                  value={customPlacesKey}
                  onChangeText={setCustomPlacesKey}
                  secureTextEntry={!customPlacesKey.includes('••••') && customPlacesKey.length > 0}
                  disabled={isSaving || (placesKeySource === 'custom' && !isEditingPlacesKey)}
                  style={styles.input}
                  left={<TextInput.Icon icon="key" />}
                />
                <HelperText type="info">
                  Get your key from console.cloud.google.com
                </HelperText>
                <View style={styles.buttonRow}>
                  {isEditingPlacesKey ? (
                    <>
                      <Button mode="outlined" onPress={() => { setIsEditingPlacesKey(false); setCustomPlacesKey(placesKeySource === 'custom' ? 'AIza••••••••••••••••••••••••••••' : ''); }} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button mode="contained" onPress={handleSavePlacesKey} loading={isSaving} disabled={isSaving || !customPlacesKey.trim() || customPlacesKey.includes('••••')}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button mode="outlined" onPress={() => { setCustomPlacesKey(''); setIsEditingPlacesKey(true); }} disabled={isSaving}>
                        Change Key
                      </Button>
                      <Button mode="outlined" onPress={handleClearPlacesKey} textColor={theme.colors.error} disabled={isSaving}>
                        Remove
                      </Button>
                    </>
                  )}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Location Tracking Section */}
        <Text variant="headlineSmall" style={[styles.sectionTitle, { marginTop: 24 }]}>
          Location Tracking
        </Text>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Periodically check your location and notify when near reminder locations.
        </Text>

        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text variant="titleMedium">Enable Tracking</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Check location for reminder matches
                </Text>
              </View>
              <Switch
                value={isTracking && locationSettings.enabled}
                onValueChange={handleToggleTracking}
                disabled={!hasEffectiveKey || !hasEffectivePlacesKey}
              />
            </View>

            {(!hasEffectiveKey || !hasEffectivePlacesKey) && (
              <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.error }]}>
                Configure both API keys to enable tracking
              </Text>
            )}

            <Divider style={styles.divider} />

            {/* Background Tracking Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text variant="titleMedium">Background Tracking</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Continue tracking when app is closed
                </Text>
              </View>
              <Switch
                value={isBackgroundTracking}
                onValueChange={handleToggleBackgroundTracking}
                disabled={!hasEffectiveKey || !hasEffectivePlacesKey}
              />
            </View>

            {backgroundPermissionStatus !== 'granted' && (
              <Text variant="bodySmall" style={[styles.warningText, { color: theme.colors.onSurfaceVariant }]}>
                Requires "Always allow" location permission
              </Text>
            )}

            <Divider style={styles.divider} />

            <Text variant="titleSmall" style={styles.subsectionTitle}>Check Interval</Text>
            <SegmentedButtons
              value={locationSettings.intervalMinutes.toString()}
              onValueChange={handleIntervalChange}
              buttons={INTERVAL_OPTIONS}
              style={styles.segmentedButtons}
            />

            <Divider style={styles.divider} />

            <View style={styles.statusSection}>
              <Text variant="titleSmall" style={styles.subsectionTitle}>Status</Text>
              <View style={styles.statusRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Permission:
                </Text>
                <Text variant="bodySmall" style={{
                  color: permissionStatus === 'granted' ? theme.colors.primary : theme.colors.error
                }}>
                  {permissionStatus}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Background:
                </Text>
                <Text variant="bodySmall" style={{
                  color: backgroundPermissionStatus === 'granted' ? theme.colors.primary : theme.colors.onSurfaceVariant
                }}>
                  {backgroundPermissionStatus === 'granted' ? 'Always allow' : backgroundPermissionStatus}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Last check:
                </Text>
                <Text variant="bodySmall">
                  {lastCheckTime ? lastCheckTime.toLocaleTimeString() : 'Never'}
                </Text>
              </View>
              {locationError && (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
                  Error: {locationError}
                </Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              {permissionStatus !== 'granted' && (
                <Button mode="outlined" onPress={handleRequestPermission}>
                  Request Permission
                </Button>
              )}
              <Button
                mode="contained"
                onPress={handleCheckNow}
                loading={isChecking}
                disabled={isChecking || !hasEffectiveKey || !hasEffectivePlacesKey || permissionStatus !== 'granted'}
                icon="map-marker-check"
              >
                Check Now
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Radius Info */}
        <View style={[styles.infoContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Searches for places within 500 feet (~152 meters) of your location.
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Background tracking requires a development build (not Expo Go) and "Always allow" location permission.
          </Text>
        </View>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Back to Reminders
        </Button>
      </ScrollView>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  subsectionTitle: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioContent: {
    flex: 1,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchContent: {
    flex: 1,
  },
  customKeySection: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  statusSection: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  warningText: {
    marginTop: 8,
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  backButton: {
    marginTop: 24,
  },
});
