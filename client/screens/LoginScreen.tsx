import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.sendOTP(email);
      if (response.success) {
        setStep('otp');
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP(email, otp, name || undefined);
      if (response.success && response.token && response.user) {
        await login(response.token, response.user);
      } else {
        setError(response.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Pay Me Drive
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Secure cloud storage for your files
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            {step === 'email' ? (
              <>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  disabled={loading}
                />

                {error && <HelperText type="error">{error}</HelperText>}

                <Button
                  mode="contained"
                  onPress={handleSendOTP}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                >
                  Send OTP
                </Button>
              </>
            ) : (
              <>
                <Text variant="bodyMedium" style={styles.otpInfo}>
                  Enter the 6-digit code sent to {email}
                </Text>

                <TextInput
                  label="Name (optional for new users)"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  disabled={loading}
                />

                <TextInput
                  label="OTP Code"
                  value={otp}
                  onChangeText={setOtp}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                  disabled={loading}
                />

                {error && <HelperText type="error">{error}</HelperText>}

                <Button
                  mode="contained"
                  onPress={handleVerifyOTP}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                >
                  Verify & Login
                </Button>

                <Button
                  mode="text"
                  onPress={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  disabled={loading}
                  style={styles.backButton}
                >
                  Back to Email
                </Button>
              </>
            )}
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  card: {
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 8,
  },
  otpInfo: {
    marginBottom: 16,
    textAlign: 'center',
  },
});
