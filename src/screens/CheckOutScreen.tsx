import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  RefreshControl,
  ScrollView
} from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, query, where, updateDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Visitor } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function CheckOutScreen() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVisitors = () => {
    const q = query(
      collection(db, 'visitors'),
      where('isCheckedOut', '==', false)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const visitorsData: Visitor[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let timeIn: Date;
        if (data.timeIn instanceof Timestamp) {
          timeIn = data.timeIn.toDate();
        } else if (data.timeIn && typeof data.timeIn.toDate === 'function') {
          timeIn = data.timeIn.toDate();
        } else if (data.timeIn) {
          timeIn = new Date(data.timeIn);
        } else {
          timeIn = new Date();
        }
        
        visitorsData.push({ 
          id: doc.id, 
          ...data,
          timeIn: timeIn
        } as Visitor);
      });
      setVisitors(visitorsData);
      setFilteredVisitors(visitorsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching visitors:', error);
      Alert.alert('Error', 'Failed to load visitors');
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchVisitors();
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  // Filter visitors based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVisitors(visitors);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = visitors.filter(visitor => {
        // Search by visitor name
        if (visitor.visitorName?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by phone number
        if (visitor.phoneNumber?.includes(searchQuery)) return true;
        // Search by ID number
        if (visitor.idNumber?.includes(searchQuery)) return true;
        // Search by vehicle plate
        if (visitor.refNumber?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by tag number
        if (visitor.tagNumber?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by tag status
        if (visitor.tagNotGiven && 'no tag'.includes(lowercasedQuery)) return true;
        if (!visitor.tagNotGiven && visitor.tagNumber && visitor.tagNumber !== 'N/A' && 'has tag'.includes(lowercasedQuery)) return true;
        // Search by residence
        if (visitor.residence?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by institution/occupation
        if (visitor.institutionOccupation?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by purpose
        if (visitor.purposeOfVisit?.toLowerCase().includes(lowercasedQuery)) return true;
        // Search by gender
        if (visitor.gender?.toLowerCase().includes(lowercasedQuery)) return true;
        
        return false;
      });
      setFilteredVisitors(filtered);
    }
  }, [searchQuery, visitors]);

  const handleCheckOut = async (visitorId: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setCheckingOut(visitorId);
    try {
      const visitorRef = doc(db, 'visitors', visitorId);
      await updateDoc(visitorRef, {
        timeOut: Timestamp.fromDate(new Date()),
        isCheckedOut: true,
        checkedOutBy: user.uid
      });
      Alert.alert('Success', 'Visitor checked out successfully ✅');
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to check out visitor: ' + error.message);
    } finally {
      setCheckingOut(null);
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

  // Helper function to get tag display
  const getTagDisplay = (tagNumber?: string, tagNotGiven?: boolean) => {
    if (tagNotGiven) {
      return { text: 'Not Given', color: '#F59E0B', icon: '❌' };
    }
    if (tagNumber && tagNumber !== 'N/A') {
      return { text: `Tag #${tagNumber}`, color: '#10B981', icon: '🏷️' };
    }
    return { text: 'N/A', color: '#6B7280', icon: '📝' };
  };

  // Helper function to get gender display
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

  const clearSearch = () => {
    setSearchQuery('');
  };

  const VisitorCard = ({ visitor }: { visitor: Visitor }) => {
    const tagDisplay = getTagDisplay(visitor.tagNumber, visitor.tagNotGiven);
    const genderDisplay = getGenderDisplay(visitor.gender);
    
    return (
      <View style={[
        styles.visitorCard,
        isSmallScreen && styles.visitorCardSmall
      ]}>
        {/* Visitor Header */}
        <View style={styles.visitorHeader}>
          <View style={styles.nameContainer}>
            <Text style={[
              styles.visitorName,
              isSmallScreen && styles.visitorNameSmall
            ]}>{visitor.visitorName}</Text>
            <View style={styles.typeAndGenderContainer}>
              <View style={[
                styles.typeBadge,
                visitor.visitorType === 'vehicle' ? styles.vehicleBadge : styles.footBadge
              ]}>
                <Text style={styles.typeBadgeText}>
                  {visitor.visitorType === 'vehicle' ? '🚗 Vehicle' : '🚶 Foot'}
                </Text>
              </View>
              <View style={[
                styles.genderBadge,
                { backgroundColor: genderDisplay.text === 'Male' ? '#DBEAFE' : 
                                 genderDisplay.text === 'Female' ? '#FCE7F3' : '#F0F9FF' }
              ]}>
                <Text style={styles.genderBadgeText}>
                  {genderDisplay.icon} {genderDisplay.text}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{safeFormatTime(visitor.timeIn)}</Text>
            <Text style={styles.dateText}>{safeFormatDate(visitor.timeIn)}</Text>
          </View>
        </View>

        {/* Visitor Details */}
        <View style={styles.visitorDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📞</Text>
            <Text style={[
              styles.detailText,
              isSmallScreen && styles.detailTextSmall
            ]}>{visitor.phoneNumber}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🆔</Text>
            <Text style={[
              styles.detailText,
              isSmallScreen && styles.detailTextSmall
            ]}>{visitor.idNumber}</Text>
          </View>

          {visitor.refNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🚙</Text>
              <Text style={[
                styles.detailText,
                isSmallScreen && styles.detailTextSmall
              ]}>{visitor.refNumber}</Text>
            </View>
          )}

          {/* Tag Information */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>{tagDisplay.icon}</Text>
            <Text style={[
              styles.detailText,
              isSmallScreen && styles.detailTextSmall,
              { color: tagDisplay.color, fontWeight: tagDisplay.text === 'Not Given' ? '600' : '500' }
            ]}>
              {tagDisplay.text}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏠</Text>
            <Text style={[
              styles.detailText,
              isSmallScreen && styles.detailTextSmall
            ]}>{visitor.residence}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💼</Text>
            <Text style={[
              styles.detailText,
              isSmallScreen && styles.detailTextSmall
            ]}>{visitor.institutionOccupation}</Text>
          </View>

          <View style={styles.purposeContainer}>
            <Text style={styles.detailIcon}>🎯</Text>
            <Text style={[
              styles.purposeText,
              isSmallScreen && styles.purposeTextSmall
            ]}>{visitor.purposeOfVisit}</Text>
          </View>
        </View>

        {/* Check Out Button */}
        <TouchableOpacity 
          style={[
            styles.checkOutButton,
            checkingOut === visitor.id && styles.checkOutButtonDisabled,
            isSmallScreen && styles.checkOutButtonSmall
          ]}
          onPress={() => handleCheckOut(visitor.id!)}
          disabled={checkingOut === visitor.id}
          activeOpacity={0.8}
        >
          {checkingOut === visitor.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={[
                styles.checkOutButtonText,
                isSmallScreen && styles.checkOutButtonTextSmall
              ]}>Check Out</Text>
              <Text style={styles.checkOutButtonIcon}>↩️</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingIcon}>⏳</Text>
          <Text style={styles.loadingText}>Loading visitors...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            ]}>Active Visitors</Text>
            <Text style={[
              styles.headerTitle,
              isSmallScreen && styles.headerTitleSmall
            ]}>Check Out</Text>
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

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[
          styles.searchCard,
          isSmallScreen && styles.searchCardSmall
        ]}>
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                isSmallScreen && styles.searchInputSmall
              ]}
              placeholder="Search by name, phone, ID, tag, residence..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.searchIcon}>🔍</Text>
            )}
          </View>
        </View>

        {/* Search Hints */}
        {searchQuery.length > 0 && (
          <View style={styles.searchHints}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Name</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Phone</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>ID</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Tag #</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Vehicle</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Residence</Text>
              </View>
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>Purpose</Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Stats Card */}
        <View style={[
          styles.statsCard,
          isSmallScreen && styles.statsCardSmall
        ]}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              isSmallScreen && styles.statValueSmall
            ]}>{filteredVisitors.length}</Text>
            <Text style={[
              styles.statLabel,
              isSmallScreen && styles.statLabelSmall
            ]}>Active Now</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              isSmallScreen && styles.statValueSmall
            ]}>{visitors.length}</Text>
            <Text style={[
              styles.statLabel,
              isSmallScreen && styles.statLabelSmall
            ]}>Total Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              isSmallScreen && styles.statValueSmall
            ]}>
              {visitors.filter(v => v.tagNumber && v.tagNumber !== 'N/A' && !v.tagNotGiven).length}
            </Text>
            <Text style={[
              styles.statLabel,
              isSmallScreen && styles.statLabelSmall
            ]}>With Tags</Text>
          </View>
        </View>

        {/* Visitors List */}
        {filteredVisitors.length === 0 ? (
          <View style={styles.emptyState}>
            {searchQuery ? (
              <>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No visitors found</Text>
                <Text style={styles.emptySubtext}>
                  No matches for "{searchQuery}"
                </Text>
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={clearSearch}
                >
                  <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyText}>All clear!</Text>
                <Text style={styles.emptySubtext}>
                  No active visitors to check out
                </Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredVisitors}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => <VisitorCard visitor={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#10B981']}
                tintColor="#10B981"
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    maxWidth: 280,
  },
  loadingIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -20,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchCardSmall: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    paddingRight: 40,
  },
  searchInputSmall: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderRadius: 10,
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    fontSize: 18,
    color: '#9CA3AF',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    backgroundColor: '#E5E7EB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  searchHints: {
    marginBottom: 12,
  },
  hintChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  hintChipText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardSmall: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 18,
  },
  filteredValue: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statLabelSmall: {
    fontSize: 10,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    paddingBottom: 20,
  },
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visitorCardSmall: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameContainer: {
    flex: 1,
  },
  visitorName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  visitorNameSmall: {
    fontSize: 18,
  },
  typeAndGenderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  vehicleBadge: {
    backgroundColor: '#DBEAFE',
  },
  footBadge: {
    backgroundColor: '#D1FAE5',
  },
  genderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  timeBadge: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },

  visitorDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  purposeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  detailTextSmall: {
    fontSize: 13,
  },
  purposeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
    fontStyle: 'italic',
  },
  purposeTextSmall: {
    fontSize: 13,
  },
  checkOutButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkOutButtonSmall: {
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkOutButtonDisabled: {
    backgroundColor: '#6EE7B7',
    shadowOpacity: 0.15,
  },
  checkOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  checkOutButtonTextSmall: {
    fontSize: 14,
    marginRight: 6,
  },
  checkOutButtonIcon: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});