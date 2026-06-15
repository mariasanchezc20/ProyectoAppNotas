import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useAuth } from '../context/AuthContext';
import { styles, colors } from '../components/styles';

export default function NotesListScreen({ navigation }) {
  const { notes, searchNotes, syncing, triggerSync, loading } = useNotes();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => searchNotes(query), [query, notes, searchNotes]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={signOut} style={{ marginRight: 12 }}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, signOut]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('NoteEditor', { clientId: item.clientId })}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.cardCategory}>{item.category}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>
        {item.plainContent}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.input}
        placeholder="Buscar por título, categoría o contenido…"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      {syncing ? (
        <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: 12 }}>
          Sincronizando…
        </Text>
      ) : null}

      <FlatList
        style={{ marginTop: 12 }}
        data={filtered}
        keyExtractor={(item) => item.clientId}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={triggerSync} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
            {query ? 'Sin resultados' : 'No tienes notas todavía. Crea la primera.'}
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.button, { marginTop: 8 }]}
        onPress={() => navigation.navigate('NoteEditor', {})}
      >
        <Text style={styles.buttonText}>+ Nueva nota</Text>
      </TouchableOpacity>
    </View>
  );
}
