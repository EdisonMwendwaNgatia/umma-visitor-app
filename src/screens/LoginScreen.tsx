import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const createUserInFirestore = async (user: any) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          role: 'user'
        });
        console.log('New user created in Firestore');
      } else {
        await setDoc(userRef, {
          lastLoginAt: new Date()
        }, { merge: true });
        console.log('User last login updated');
      }
    } catch (error) {
      console.error('Error creating/updating user in Firestore:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await createUserInFirestore(user);
      console.log('Login successful for:', user.email);
      
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={[
            styles.header,
            isSmallScreen && styles.headerSmall
          ]}>
            <View style={styles.headerContent}>
              <View style={[
                styles.logoContainer,
                isSmallScreen && styles.logoContainerSmall
              ]}>
                <Text style={[
                  styles.logoIcon,
                  isSmallScreen && styles.logoIconSmall
                ]}>🏢</Text>
              </View>
              <View style={styles.titleContainer}>
                <Text style={[
                  styles.title,
                  isSmallScreen && styles.titleSmall
                ]}>Umma Visitors</Text>
                <Text style={[
                  styles.subtitle,
                  isSmallScreen && styles.subtitleSmall
                ]}>Visitor Management System</Text>
              </View>
            </View>
          </View>

          {/* Login Form Card */}
          <View style={[
            styles.formCard,
            isSmallScreen && styles.formCardSmall
          ]}>
            <View style={styles.welcomeSection}>
              <Text style={[
                styles.welcomeTitle,
                isSmallScreen && styles.welcomeTitleSmall
              ]}>Welcome Back</Text>
              <Text style={[
                styles.welcomeSubtitle,
                isSmallScreen && styles.welcomeSubtitleSmall
              ]}>Sign in to continue</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[
                styles.inputLabel,
                isSmallScreen && styles.inputLabelSmall
              ]}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    isSmallScreen && styles.inputSmall
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={!loading}
                />
                <Text style={styles.inputIcon}>📧</Text>
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[
                styles.inputLabel,
                isSmallScreen && styles.inputLabelSmall
              ]}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    isSmallScreen && styles.inputSmall
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.visibilityToggle}
                  onPress={togglePasswordVisibility}
                  disabled={loading}
                >
                  <Text style={styles.visibilityIcon}>
                    {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
                isSmallScreen && styles.loginButtonSmall
              ]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={[
                    styles.loginButtonText,
                    isSmallScreen && styles.loginButtonTextSmall
                  ]}>Sign In</Text>
                  <Text style={styles.loginButtonIcon}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[
                styles.forgotPasswordText,
                isSmallScreen && styles.forgotPasswordTextSmall
              ]}>
                Forgot your password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Footer */}
          <View style={[
            styles.securityCard,
            isSmallScreen && styles.securityCardSmall
          ]}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={[
              styles.securityText,
              isSmallScreen && styles.securityTextSmall
            ]}>Secure visitor management system</Text>
            <Text style={[
              styles.securitySubtext,
              isSmallScreen && styles.securitySubtextSmall
            ]}>Your data is protected</Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#10B981',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerSmall: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainerSmall: {
    width: 70,
    height: 70,
    borderRadius: 18,
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoIconSmall: {
    fontSize: 32,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 28,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#D1FAE5',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitleSmall: {
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  formCardSmall: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 20,
    marginTop: -16,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeTitleSmall: {
    fontSize: 24,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  welcomeSubtitleSmall: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputLabelSmall: {
    fontSize: 14,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 52,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  inputSmall: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    fontSize: 14,
    borderRadius: 14,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 20,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  visibilityIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  loginButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonSmall: {
    paddingVertical: 16,
    borderRadius: 14,
  },
  loginButtonDisabled: {
    backgroundColor: '#6EE7B7',
    shadowOpacity: 0.15,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  loginButtonTextSmall: {
    fontSize: 16,
    marginRight: 6,
  },
  loginButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  forgotPasswordTextSmall: {
    fontSize: 13,
  },
  securityCard: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  securityCardSmall: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  securityIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  securityTextSmall: {
    fontSize: 13,
  },
  securitySubtext: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
  },
  securitySubtextSmall: {
    fontSize: 11,
  },
  bottomPadding: {
    height: 40,
  },
});