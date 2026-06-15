import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNotes } from '../context/NotesContext';
import { styles, colors } from '../components/styles';

export default function NoteEditorScreen({ route, navigation }) {
  const { clientId } = route.params || {};
  const { notes, createNote, updateNote, deleteNote } = useNotes();

  const existing = clientId ? notes.find((n) => n.clientId === clientId) : null;

  const [title, setTitle] = useState(existing?.title || '');
  const [category, setCategory] = useState(existing?.category || 'General');
  const [content, setContent] = useState(existing?.plainContent || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Editar nota' : 'Nueva nota' });
  }, [existing, navigation]);

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Falta el título', 'La nota necesita un título.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateNote(clientId, { title: title.trim(), category, content });
      } else {
        await createNote({ title: title.trim(), category, content });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la nota.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Eliminar nota', '¿Seguro que quieres eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(clientId);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        placeholder="Título de la nota"
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Categoría</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Trabajo, Personal…"
        placeholderTextColor={colors.textMuted}
        value={category}
        onChangeText={setCategory}
      />

      <Text style={styles.label}>Contenido (se cifra en tu dispositivo)</Text>
      <TextInput
        style={[styles.input, { height: 200, textAlignVertical: 'top' }]}
        placeholder="Escribe aquí…"
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
      </TouchableOpacity>

      {existing ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.danger }]}
          onPress={onDelete}
        >
          <Text style={styles.buttonText}>Eliminar nota</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}
