import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { styles, colors } from '../components/styles';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async () => {
    setError('');
    if (!email || !password) return setError('Completa todos los campos');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (password !== confirm) return setError('Las contraseñas no coinciden');

    setLoading(true);
    try {
      await signUp({ email: email.trim(), password });
      Alert.alert(
        'Cuenta creada',
        'Te enviamos un correo de verificación. Actívala antes de iniciar sesión.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e) {
      const msg = e.response?.data?.message || 'No se pudo registrar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Tus notas se cifran en tu dispositivo</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@correo.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, { paddingRight: 70 }]}
            secureTextEntry={!showPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
            onPress={() => setShowPassword(v => !v)}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[styles.input, { paddingRight: 70 }]}
            secureTextEntry={!showConfirm}
            placeholder="Repite la contraseña"
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' }}
            onPress={() => setShowConfirm(v => !v)}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{showConfirm ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarme</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
