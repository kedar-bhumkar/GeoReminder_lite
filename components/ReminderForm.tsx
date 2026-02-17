import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { TextInput, Button, HelperText, useTheme, Divider } from 'react-native-paper';
import { EntityEditor } from './EntityEditor';

interface ReminderFormProps {
  initialValue?: string;
  initialEntities?: string[];
  onSubmit: (text: string, entities: string[]) => void;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  showEntityEditor?: boolean;
}

export function ReminderForm({
  initialValue = '',
  initialEntities = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isLoading = false,
  showEntityEditor = true,
}: ReminderFormProps) {
  const [text, setText] = useState(initialValue);
  const [entities, setEntities] = useState<string[]>(initialEntities);
  const [error, setError] = useState('');
  const inputRef = useRef<RNTextInput>(null);
  const theme = useTheme();

  useEffect(() => {
    // Auto-focus the input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Please enter a reminder');
      return;
    }
    setError('');
    onSubmit(trimmedText, entities);
  };

  const handleChangeText = (value: string) => {
    setText(value);
    if (error) setError('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        mode="outlined"
        label="Reminder"
        placeholder="e.g., Buy milk at Costco and pick up prescription from CVS"
        value={text}
        onChangeText={handleChangeText}
        multiline
        numberOfLines={3}
        style={styles.input}
        error={!!error}
        disabled={isLoading}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      <HelperText type="info" visible={!error && !isLoading}>
        Tip: Include locations (e.g., "at Costco", "from CVS"). AI will extract them automatically.
      </HelperText>
      <HelperText type="info" visible={isLoading}>
        Extracting locations with AI...
      </HelperText>

      {showEntityEditor && (
        <>
          <Divider style={styles.divider} />
          <EntityEditor
            entities={entities}
            onChange={setEntities}
            disabled={isLoading}
          />
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          {submitLabel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    minWidth: 100,
  },
});
