import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { auth, db } from '../config/firebase';
import { updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Visitor } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface EditVisitorFormProps {
  visitor: Visitor;
  onUpdateSuccess: () => void;
  onBack: () => void;
}

export default function EditVisitorForm({ 
  visitor, 
  onUpdateSuccess, 
  onBack 
}: EditVisitorFormProps) {
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    visitorName: visitor.visitorName || '',
    phoneNumber: visitor.phoneNumber || '',
    idNumber: visitor.idNumber || '',
    residence: visitor.residence || '',
    institutionOccupation: visitor.institutionOccupation || '',
    purposeOfVisit: visitor.purposeOfVisit || '',
    tagNumber: visitor.tagNumber || '',
    gender: visitor.gender || '',
  });

  const handleUpdateVisitor = async () => {
    if (!visitor.id) {
      Alert.alert('Error', 'No visitor selected');
      return;
    }

    if (!formData.visitorName || !formData.phoneNumber || !formData.residence) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setUpdating(true);
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      setUpdating(false);
      return;
    }

    try {
      const visitorRef = doc(db, 'visitors', visitor.id);
      await updateDoc(visitorRef, {
        visitorName: formData.visitorName,
        phoneNumber: formData.phoneNumber,
        idNumber: formData.idNumber,
        residence: formData.residence,
        institutionOccupation: formData.institutionOccupation,
        purposeOfVisit: formData.purposeOfVisit,
        tagNumber: formData.tagNumber,
        gender: formData.gender,
        updatedAt: Timestamp.now(),
        updatedBy: user.uid,
      });

      Alert.alert('Success', 'Visitor details updated successfully ✅');
      onUpdateSuccess();
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update visitor: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const safeFormatTime = (date: any) => {
    try {
      let actualDate: Date;
      
      if (date instanceof Date) {
        actualDate = date;
      } else if (date instanceof Timestamp) {
        actualDate = date.toDate();
      } else if (date && typeof date.toDate === 'function') {
        actualDate = date.toDate();
      } else if (date) {
        actualDate = new Date(date);
      } else {
        return 'N/A';
      }

      if (isNaN(actualDate.getTime())) {
        return 'Invalid';
      }

      return actualDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Error';
    }
  };

  const safeFormatDate = (date: any) => {
    try {
      let actualDate: Date;
      
      if (date instanceof Date) {
        actualDate = date;
      } else if (date instanceof Timestamp) {
        actualDate = date.toDate();
      } else if (date && typeof date.toDate === 'function') {
        actualDate = date.toDate();
      } else if (date) {
        actualDate = new Date(date);
      } else {
        return 'N/A';
      }

      if (isNaN(actualDate.getTime())) {
        return 'Invalid';
      }

      return actualDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Error';
    }
  };

  const getTagDisplay = (tagNumber?: string, tagNotGiven?: boolean) => {
    if (tagNotGiven) {
      return { text: 'Not Given', color: '#F59E0B', icon: '❌' };
    }
    if (tagNumber && tagNumber !== 'N/A') {
      return { text: `Tag #${tagNumber}`, color: '#10B981', icon: '🏷️' };
    }
    return { text: 'N/A', color: '#6B7280', icon: '📝' };
  };

  const getGenderDisplay = (gender?: string) => {
    if (!gender || gender === 'N/A') {
      return { text: 'N/A', icon: '❓' };
    }
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male') return { text: 'Male', icon: '👨' };
    if (lowerGender === 'female') return { text: 'Female', icon: '👩' };
    if (lowerGender === 'other') return { text: 'Other', icon: '⚧' };
    return { text: gender, icon: '❓' };
  };

  const tagDisplay = getTagDisplay(visitor.tagNumber, visitor.tagNotGiven);
  const genderDisplay = getGenderDisplay(visitor.gender);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button & Title */}
        <View style={[
          styles.editHeader,
          isSmallScreen && styles.editHeaderSmall
        ]}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={[
              styles.editTitle,
              isSmallScreen && styles.editTitleSmall
            ]}>
              Edit Visitor
            </Text>
            <Text style={[
              styles.selectedVisitorName,
              isSmallScreen && styles.selectedVisitorNameSmall
            ]}>
              {visitor.visitorName}
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={[
          styles.formCard,
          isSmallScreen && styles.formCardSmall
        ]}>
          <Text style={[
            styles.sectionTitle,
            isSmallScreen && styles.sectionTitleSmall
          ]}>
            Personal Information
          </Text>

          <View style={[
            styles.inputContainer,
            isSmallScreen && styles.inputContainerSmall
          ]}>
            <Text style={[
              styles.label,
              isSmallScreen && styles.labelSmall
            ]}>
              Visitor Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.visitorName}
              onChangeText={(text) => setFormData({...formData, visitorName: text})}
              placeholder="Enter visitor name"
              placeholderTextColor="#9CA3AF"
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
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
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
              ID Number
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.idNumber}
              onChangeText={(text) => setFormData({...formData, idNumber: text})}
              placeholder="Enter ID number (optional)"
              placeholderTextColor="#9CA3AF"
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
              Gender
            </Text>
            <View style={styles.genderContainer}>
              {['Male', 'Female', 'Other'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderOption,
                    formData.gender === gender && styles.genderOptionSelected,
                    gender === 'Male' && formData.gender === gender && { backgroundColor: '#DBEAFE' },
                    gender === 'Female' && formData.gender === gender && { backgroundColor: '#FCE7F3' },
                    gender === 'Other' && formData.gender === gender && { backgroundColor: '#F0F9FF' },
                  ]}
                  onPress={() => setFormData({...formData, gender})}
                >
                  <Text style={[
                    styles.genderOptionText,
                    formData.gender === gender && styles.genderOptionTextSelected
                  ]}>
                    {gender === 'Male' ? '👨' : gender === 'Female' ? '👩' : '⚧'} {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={[
            styles.sectionTitle,
            isSmallScreen && styles.sectionTitleSmall
          ]}>
            Visit Information
          </Text>

          <View style={[
            styles.inputContainer,
            isSmallScreen && styles.inputContainerSmall
          ]}>
            <Text style={[
              styles.label,
              isSmallScreen && styles.labelSmall
            ]}>
              Residence <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.residence}
              onChangeText={(text) => setFormData({...formData, residence: text})}
              placeholder="Enter residence"
              placeholderTextColor="#9CA3AF"
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
              Institution/Occupation
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.institutionOccupation}
              onChangeText={(text) => setFormData({...formData, institutionOccupation: text})}
              placeholder="Enter institution or occupation"
              placeholderTextColor="#9CA3AF"
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
              Purpose of Visit
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                isSmallScreen && styles.inputSmall,
                isSmallScreen && styles.textAreaSmall
              ]}
              value={formData.purposeOfVisit}
              onChangeText={(text) => setFormData({...formData, purposeOfVisit: text})}
              placeholder="Enter purpose of visit"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
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
              Tag Number
            </Text>
            <TextInput
              style={[
                styles.input,
                isSmallScreen && styles.inputSmall
              ]}
              value={formData.tagNumber}
              onChangeText={(text) => setFormData({...formData, tagNumber: text})}
              placeholder="Enter tag number (optional)"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Visitor Info Card (Read-only) */}
          <View style={[
            styles.infoCard,
            isSmallScreen && styles.infoCardSmall
          ]}>
            <Text style={[
              styles.infoTitle,
              isSmallScreen && styles.infoTitleSmall
            ]}>
              Current Information
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🕒</Text>
              <Text style={[
                styles.infoText,
                isSmallScreen && styles.infoTextSmall
              ]}>
                Checked in: {safeFormatTime(visitor.timeIn)} • {safeFormatDate(visitor.timeIn)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📋</Text>
              <Text style={[
                styles.infoText,
                isSmallScreen && styles.infoTextSmall
              ]}>
                Type: {visitor.visitorType === 'vehicle' ? '🚗 Vehicle' : '🚶 Foot'}
                {visitor.refNumber && ` • Plate: ${visitor.refNumber}`}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>{genderDisplay.icon}</Text>
              <Text style={[
                styles.infoText,
                isSmallScreen && styles.infoTextSmall
              ]}>
                Gender: {genderDisplay.text}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>{tagDisplay.icon}</Text>
              <Text style={[
                styles.infoText,
                isSmallScreen && styles.infoTextSmall,
                { color: tagDisplay.color }
              ]}>
                Tag: {tagDisplay.text}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[
          styles.buttonContainer,
          isSmallScreen && styles.buttonContainerSmall
        ]}>
          <TouchableOpacity
            style={[
              styles.cancelButton,
              isSmallScreen && styles.cancelButtonSmall
            ]}
            onPress={onBack}
            disabled={updating}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.cancelButtonText,
              isSmallScreen && styles.cancelButtonTextSmall
            ]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.updateButton,
              isSmallScreen && styles.updateButtonSmall,
              updating && styles.updateButtonDisabled
            ]}
            onPress={handleUpdateVisitor}
            disabled={updating}
            activeOpacity={0.7}
          >
            {updating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[
                styles.updateButtonText,
                isSmallScreen && styles.updateButtonTextSmall
              ]}>
                Update Details
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingBottom: 30,
  },
  editHeader: {
    backgroundColor: '#10B981',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editHeaderSmall: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  editTitleSmall: {
    fontSize: 20,
  },
  selectedVisitorName: {
    fontSize: 14,
    color: '#DBEAFE',
    fontWeight: '500',
  },
  selectedVisitorNameSmall: {
    fontSize: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formCardSmall: {
    borderRadius: 16,
    padding: 16,
    margin: 12,
    marginTop: -16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitleSmall: {
    fontSize: 16,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputContainerSmall: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  labelSmall: {
    fontSize: 12,
    marginBottom: 4,
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
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  inputSmall: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderRadius: 10,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 100,
    paddingTop: 12,
  },
  textAreaSmall: {
    minHeight: 80,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    borderColor: '#007AFF',
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderOptionTextSelected: {
    color: '#007AFF',
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoCardSmall: {
    padding: 12,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoTitleSmall: {
    fontSize: 14,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  infoTextSmall: {
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  buttonContainerSmall: {
    paddingHorizontal: 12,
    paddingBottom: 25,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cancelButtonSmall: {
    paddingVertical: 14,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  cancelButtonTextSmall: {
    fontSize: 14,
  },
  updateButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonSmall: {
    paddingVertical: 14,
    borderRadius: 10,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  updateButtonTextSmall: {
    fontSize: 14,
  },
});