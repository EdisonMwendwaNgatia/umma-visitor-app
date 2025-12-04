import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  RefreshControl
} from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Visitor } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

// Create a stable FormInput component outside the main component to prevent re-renders
const FormInput = React.memo(({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false,
  keyboardType = 'default',
  multiline = false,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  required?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  multiline?: boolean;
  disabled?: boolean;
}) => (
  <View style={[
    styles.inputContainer,
    isSmallScreen && styles.inputContainerSmall
  ]}>
    <Text style={[
      styles.label,
      isSmallScreen && styles.labelSmall
    ]}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={[
        styles.input,
        multiline && styles.textArea,
        isSmallScreen && styles.inputSmall,
        multiline && isSmallScreen && styles.textAreaSmall,
        disabled && styles.inputDisabled
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
      editable={!disabled}
      selectTextOnFocus={!disabled}
    />
  </View>
));

export default function CheckInScreen() {
  const [visitorType, setVisitorType] = useState<'foot' | 'vehicle'>('foot');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gender, setGender] = useState<string>('');
  const [tagNotGiven, setTagNotGiven] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    visitorName: '',
    phoneNumber: '',
    idNumber: '',
    refNumber: '',
    residence: '',
    institutionOccupation: '',
    purposeOfVisit: '',
    tagNumber: '', // Added tag number field
    // gender is now handled separately as a radio button selection
  });

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleTagNotGivenToggle = useCallback(() => {
    setTagNotGiven(prev => !prev);
    // Clear tag number when checkbox is checked
    if (!tagNotGiven) {
      handleInputChange('tagNumber', '');
    }
  }, [tagNotGiven, handleInputChange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset form
    setFormData({
      visitorName: '',
      phoneNumber: '',
      idNumber: '',
      refNumber: '',
      residence: '',
      institutionOccupation: '',
      purposeOfVisit: '',
      tagNumber: ''
    });
    setGender('');
    setVisitorType('foot');
    setTagNotGiven(false);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCheckIn = async () => {
    // Validation
    if (!formData.visitorName.trim() || !formData.phoneNumber.trim() || !formData.idNumber.trim() || 
        !formData.residence.trim() || !formData.institutionOccupation.trim() || !formData.purposeOfVisit.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!gender) {
      Alert.alert('Error', 'Please select gender');
      return;
    }

    if (visitorType === 'vehicle' && !formData.refNumber.trim()) {
      Alert.alert('Error', 'Vehicle plate number is required');
      return;
    }

    // Tag number validation if tag is given
    if (!tagNotGiven && !formData.tagNumber.trim()) {
      Alert.alert('Error', 'Please enter tag number or check "Tag Not Given"');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Use Firestore Timestamp for consistent date handling
      const visitorData: any = {
        visitorName: formData.visitorName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        idNumber: formData.idNumber.trim(),
        residence: formData.residence.trim(),
        institutionOccupation: formData.institutionOccupation.trim(),
        purposeOfVisit: formData.purposeOfVisit.trim(),
        gender: gender, // Add gender field
        timeIn: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
        visitorType: visitorType,
        checkedInBy: user.uid,
        isCheckedOut: false,
        tagNotGiven: tagNotGiven, // Add tag not given flag
      };

      // Only include refNumber if it's a vehicle visitor and has a value
      if (visitorType === 'vehicle' && formData.refNumber.trim()) {
        visitorData.refNumber = formData.refNumber.trim();
      }

      // Only include tagNumber if tag is given
      if (!tagNotGiven && formData.tagNumber.trim()) {
        visitorData.tagNumber = formData.tagNumber.trim();
      } else {
        visitorData.tagNumber = 'N/A'; // Or you can leave it empty if preferred
      }

      await addDoc(collection(db, 'visitors'), visitorData);
      
      Alert.alert('Success', 'Visitor checked in successfully ✅', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setFormData({
              visitorName: '',
              phoneNumber: '',
              idNumber: '',
              refNumber: '',
              residence: '',
              institutionOccupation: '',
              purposeOfVisit: '',
              tagNumber: ''
            });
            setGender('');
            setVisitorType('foot');
            setTagNotGiven(false);
          }
        }
      ]);
      
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in visitor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorTypeChange = useCallback((type: 'foot' | 'vehicle') => {
    setVisitorType(type);
    if (type === 'foot') {
      setFormData(prev => ({
        ...prev,
        refNumber: ''
      }));
    }
  }, []);

  const handleGenderSelect = useCallback((selectedGender: string) => {
    setGender(selectedGender);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      >
        {/* Header */}
        <View style={[
          styles.header,
          isSmallScreen && styles.headerSmall
        ]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[
                styles.greeting,
                isSmallScreen && styles.greetingSmall
              ]}>New Visitor</Text>
              <Text style={[
                styles.headerTitle,
                isSmallScreen && styles.headerTitleSmall
              ]}>Check In</Text>
            </View>
            <View style={[
              styles.dateCard,
              isSmallScreen && styles.dateCardSmall
            ]}>
              <Text style={[
                styles.dateText,
                isSmallScreen && styles.dateTextSmall
              ]}>
                {new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* Visitor Type Tabs */}
          <View style={[
            styles.tabContainer,
            isSmallScreen && styles.tabContainerSmall
          ]}>
            <TouchableOpacity 
              style={[
                styles.tab, 
                visitorType === 'foot' && styles.activeTab,
                isSmallScreen && styles.tabSmall
              ]}
              onPress={() => handleVisitorTypeChange('foot')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabIcon,
                isSmallScreen && styles.tabIconSmall
              ]}>🚶</Text>
              <Text style={[
                styles.tabText,
                visitorType === 'foot' && styles.activeTabText,
                isSmallScreen && styles.tabTextSmall
              ]}>
                On Foot
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.tab, 
                visitorType === 'vehicle' && styles.activeTab,
                isSmallScreen && styles.tabSmall
              ]}
              onPress={() => handleVisitorTypeChange('vehicle')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabIcon,
                isSmallScreen && styles.tabIconSmall
              ]}>🚗</Text>
              <Text style={[
                styles.tabText,
                visitorType === 'vehicle' && styles.activeTabText,
                isSmallScreen && styles.tabTextSmall
              ]}>
                Vehicle
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={[
            styles.formCard,
            isSmallScreen && styles.formCardSmall
          ]}>
            <Text style={[
              styles.sectionTitle,
              isSmallScreen && styles.sectionTitleSmall
            ]}>Visitor Information</Text>

            <FormInput
              label="Full Name"
              value={formData.visitorName}
              onChange={(text) => handleInputChange('visitorName', text)}
              placeholder="Enter visitor's full name"
              required
            />

            {/* Gender Selection */}
            <View style={[
              styles.inputContainer,
              isSmallScreen && styles.inputContainerSmall
            ]}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall
              ]}>
                Gender <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={[
                    styles.genderOption,
                    gender === 'Male' && styles.genderOptionSelected,
                    isSmallScreen && styles.genderOptionSmall
                  ]}
                  onPress={() => handleGenderSelect('Male')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderIcon,
                    isSmallScreen && styles.genderIconSmall
                  ]}>👨</Text>
                  <Text style={[
                    styles.genderText,
                    gender === 'Male' && styles.genderTextSelected,
                    isSmallScreen && styles.genderTextSmall
                  ]}>Male</Text>
                  {gender === 'Male' && (
                    <View style={styles.genderCheck}>
                      <Text style={styles.genderCheckIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.genderOption,
                    gender === 'Female' && styles.genderOptionSelected,
                    isSmallScreen && styles.genderOptionSmall
                  ]}
                  onPress={() => handleGenderSelect('Female')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderIcon,
                    isSmallScreen && styles.genderIconSmall
                  ]}>👩</Text>
                  <Text style={[
                    styles.genderText,
                    gender === 'Female' && styles.genderTextSelected,
                    isSmallScreen && styles.genderTextSmall
                  ]}>Female</Text>
                  {gender === 'Female' && (
                    <View style={styles.genderCheck}>
                      <Text style={styles.genderCheckIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.genderOption,
                    gender === 'Other' && styles.genderOptionSelected,
                    isSmallScreen && styles.genderOptionSmall
                  ]}
                  onPress={() => handleGenderSelect('Other')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.genderIcon,
                    isSmallScreen && styles.genderIconSmall
                  ]}>⚧</Text>
                  <Text style={[
                    styles.genderText,
                    gender === 'Other' && styles.genderTextSelected,
                    isSmallScreen && styles.genderTextSmall
                  ]}>Other</Text>
                  {gender === 'Other' && (
                    <View style={styles.genderCheck}>
                      <Text style={styles.genderCheckIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <FormInput
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(text) => handleInputChange('phoneNumber', text)}
              placeholder="Enter phone number"
              required
              keyboardType="phone-pad"
            />

            <FormInput
              label="ID Number"
              value={formData.idNumber}
              onChange={(text) => handleInputChange('idNumber', text)}
              placeholder="Enter ID number"
              required
            />

            {visitorType === 'vehicle' && (
              <FormInput
                label="Vehicle Plate"
                value={formData.refNumber}
                onChange={(text) => handleInputChange('refNumber', text)}
                placeholder="Enter vehicle plate number"
                required
              />
            )}

            <FormInput
              label="Residence"
              value={formData.residence}
              onChange={(text) => handleInputChange('residence', text)}
              placeholder="Enter residence address"
              required
            />

            <FormInput
              label="Institution/Occupation"
              value={formData.institutionOccupation}
              onChange={(text) => handleInputChange('institutionOccupation', text)}
              placeholder="Enter institution or occupation"
              required
            />

            {/* Tag Number Section */}
            <View style={[
              styles.inputContainer,
              isSmallScreen && styles.inputContainerSmall
            ]}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall
              ]}>
                Visitor Tag Number
              </Text>
              
              {/* Tag Not Given Checkbox */}
              <TouchableOpacity 
                style={[
                  styles.checkboxContainer,
                  isSmallScreen && styles.checkboxContainerSmall
                ]}
                onPress={handleTagNotGivenToggle}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  tagNotGiven && styles.checkboxChecked,
                  isSmallScreen && styles.checkboxSmall
                ]}>
                  {tagNotGiven && (
                    <Text style={styles.checkboxIcon}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.checkboxLabel,
                  isSmallScreen && styles.checkboxLabelSmall
                ]}>
                  Tag not given to visitor
                </Text>
              </TouchableOpacity>

              {/* Tag Number Input */}
              <TextInput
                style={[
                  styles.input,
                  isSmallScreen && styles.inputSmall,
                  tagNotGiven && styles.inputDisabled,
                  styles.tagInput
                ]}
                value={formData.tagNumber}
                onChangeText={(text) => handleInputChange('tagNumber', text)}
                placeholder={tagNotGiven ? "Tag not given" : "Enter visitor tag number"}
                placeholderTextColor={tagNotGiven ? "#CBD5E1" : "#9CA3AF"}
                keyboardType="numeric"
                editable={!tagNotGiven}
                selectTextOnFocus={!tagNotGiven}
              />
            </View>

            <View style={[
              styles.inputContainer,
              isSmallScreen && styles.inputContainerSmall
            ]}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall
              ]}>
                Purpose of Visit <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  isSmallScreen && styles.inputSmall,
                  isSmallScreen && styles.textAreaSmall
                ]}
                value={formData.purposeOfVisit}
                onChangeText={(text) => handleInputChange('purposeOfVisit', text)}
                placeholder="Describe the purpose of visit..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={true}
                selectTextOnFocus={false}
              />
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <Text style={[
                styles.label,
                isSmallScreen && styles.labelSmall
              ]}>Digital Signature</Text>
              <View style={[
                styles.signaturePlaceholder,
                isSmallScreen && styles.signaturePlaceholderSmall
              ]}>
                <Text style={styles.signatureIcon}>✍️</Text>
                <Text style={[
                  styles.signatureText,
                  isSmallScreen && styles.signatureTextSmall
                ]}>Tap to sign</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                loading && styles.submitButtonDisabled,
                isSmallScreen && styles.submitButtonSmall
              ]}
              onPress={handleCheckIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={[
                    styles.submitButtonText,
                    isSmallScreen && styles.submitButtonTextSmall
                  ]}>Check In Visitor</Text>
                  <Text style={styles.submitButtonIcon}>✅</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerSmall: {
    paddingTop: 50,
    paddingBottom: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 15,
    color: '#D1FAE5',
    fontWeight: '500',
    marginBottom: 4,
  },
  greetingSmall: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerTitleSmall: {
    fontSize: 20,
  },
  dateCard: {
    backgroundColor: '#FFFFFF20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dateCardSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateTextSmall: {
    fontSize: 12,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabContainerSmall: {
    borderRadius: 14,
    padding: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabSmall: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  tabIconSmall: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextSmall: {
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formCardSmall: {
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  sectionTitleSmall: {
    fontSize: 18,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputContainerSmall: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  labelSmall: {
    fontSize: 14,
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  inputSmall: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderRadius: 10,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    color: '#94A3B8',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  textAreaSmall: {
    minHeight: 80,
    paddingTop: 12,
  },
  tagInput: {
    marginTop: 10,
  },
  // Checkbox Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  checkboxContainerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxSmall: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  checkboxLabelSmall: {
    fontSize: 13,
  },
  // Gender Styles
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  genderOptionSmall: {
    paddingVertical: 12,
    borderRadius: 10,
  },
  genderOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  genderIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  genderIconSmall: {
    fontSize: 20,
    marginBottom: 6,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderTextSmall: {
    fontSize: 14,
  },
  genderTextSelected: {
    color: '#059669',
  },
  genderCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderCheckIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  signaturePlaceholder: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#D1FAE5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  signaturePlaceholderSmall: {
    padding: 20,
    minHeight: 100,
    borderRadius: 10,
  },
  signatureIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.7,
  },
  signatureText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  signatureTextSmall: {
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonSmall: {
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#6EE7B7',
    shadowOpacity: 0.15,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  submitButtonTextSmall: {
    fontSize: 16,
    marginRight: 6,
  },
  submitButtonIcon: {
    fontSize: 18,
  },
  bottomPadding: {
    height: 20,
  },
});