import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Visitor } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function AlertsScreen() {
  const [overdueVisitors, setOverdueVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const parseFirebaseDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    if (dateValue instanceof Date) return dateValue;
    if (dateValue instanceof Timestamp) return dateValue.toDate();
    if (dateValue && typeof dateValue.toDate === 'function') return dateValue.toDate();
    if (typeof dateValue === 'string') {
      try {
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (error) {
        console.error('Error parsing date string:', error);
      }
    }
    return new Date();
  };

  const fetchOverdueVisitors = () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const q = query(
      collection(db, 'visitors'),
      where('isCheckedOut', '==', false)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const visitorsData: Visitor[] = [];
      const now = new Date();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timeIn = parseFirebaseDate(data.timeIn);
        
        const visitor = { 
          id: doc.id, 
          ...data,
          timeIn: timeIn
        } as Visitor;
        
        // CHANGED: Use 12+ hour overdue logic instead of 24
        const hoursSinceCheckIn = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCheckIn > 12) {
          visitorsData.push(visitor);
        }
      });
      
      setOverdueVisitors(visitorsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching visitors:', error);
      Alert.alert('Error', 'Failed to load alerts: ' + error.message);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchOverdueVisitors();
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOverdueVisitors();
  };

  const getHoursOverdue = (timeIn: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timeIn.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (remainingHours === 0) {
        return `${days}d`;
      }
      return `${days}d ${remainingHours}h`;
    }
  };

  const getAlertLevel = (hours: number) => {
    if (hours >= 24) return 'critical';    
    if (hours >= 18) return 'high';       
    if (hours >= 12) return 'medium';      
    return 'low';
  };

  const OverdueVisitorCard = ({ visitor }: { visitor: Visitor }) => {
    const hoursOverdue = getHoursOverdue(visitor.timeIn);
    const durationText = formatDuration(hoursOverdue);
    const alertLevel = getAlertLevel(hoursOverdue);
    
    const alertColors = {
      critical: { bg: '#FEF2F2', border: '#EF4444', text: '#DC2626', badge: '#EF4444' },
      high: { bg: '#FFFBEB', border: '#F59E0B', text: '#D97706', badge: '#F59E0B' },
      medium: { bg: '#F0FDF4', border: '#10B981', text: '#059669', badge: '#10B981' },
      low: { bg: '#F0FDF4', border: '#10B981', text: '#059669', badge: '#10B981' }
    };

    const colors = alertColors[alertLevel];

    return (
      <View style={[
        styles.alertCard,
        isSmallScreen && styles.alertCardSmall,
        { backgroundColor: colors.bg, borderLeftColor: colors.border }
      ]}>
        <View style={styles.alertHeader}>
          <View style={styles.nameContainer}>
            <Text style={[
              styles.alertName,
              isSmallScreen && styles.alertNameSmall
            ]}>{visitor.visitorName}</Text>
            <View style={[
              styles.typeBadge,
              visitor.visitorType === 'vehicle' ? styles.vehicleBadge : styles.footBadge
            ]}>
              <Text style={styles.typeBadgeText}>
                {visitor.visitorType === 'vehicle' ? '🚗 Vehicle' : '🚶 Foot'}
              </Text>
            </View>
          </View>
          <View style={[styles.alertBadge, { backgroundColor: colors.badge }]}>
            <Text style={styles.alertBadgeText}>
              {durationText}
            </Text>
          </View>
        </View>
        
        <View style={styles.alertDetails}>
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

          <View style={styles.timeContainer}>
            <Text style={styles.timeIcon}>⏰</Text>
            <Text style={styles.timeText}>
              Checked in: {visitor.timeIn.toLocaleDateString()} at {visitor.timeIn.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        </View>

        <View style={styles.alertFooter}>
          <Text style={[styles.alertLevelText, { color: colors.text }]}>
            {alertLevel.toUpperCase()} PRIORITY
          </Text>
          <Text style={styles.hoursText}>
            {hoursOverdue} hours overdue
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingIcon}>⏳</Text>
          <Text style={styles.loadingText}>Loading alerts...</Text>
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
            ]}>Attention Needed</Text>
            <Text style={[
              styles.headerTitle,
              isSmallScreen && styles.headerTitleSmall
            ]}>Alerts</Text>
          </View>
          <View style={[
            styles.alertCountBadge,
            isSmallScreen && styles.alertCountBadgeSmall
          ]}>
            <Text style={[
              styles.alertCountText,
              isSmallScreen && styles.alertCountTextSmall
            ]}>
              {overdueVisitors.length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Summary Card */}
        <View style={[
          styles.summaryCard,
          isSmallScreen && styles.summaryCardSmall
        ]}>
          <View style={styles.summaryHeader}>
            <Text style={[
              styles.summaryTitle,
              isSmallScreen && styles.summaryTitleSmall
            ]}>Overdue Visitors</Text>
            <Text style={styles.summarySubtitle}>12+ hours checked in</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall
              ]}>{overdueVisitors.length}</Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall
              ]}>Total</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                styles.criticalValue
              ]}>
                {overdueVisitors.filter(v => getHoursOverdue(v.timeIn) >= 24).length}
              </Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall
              ]}>Critical</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                styles.highValue
              ]}>
                {overdueVisitors.filter(v => getHoursOverdue(v.timeIn) >= 18 && getHoursOverdue(v.timeIn) < 24).length}
              </Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall
              ]}>High</Text>
            </View>

            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                isSmallScreen && styles.statValueSmall,
                styles.mediumValue
              ]}>
                {overdueVisitors.filter(v => getHoursOverdue(v.timeIn) >= 12 && getHoursOverdue(v.timeIn) < 18).length}
              </Text>
              <Text style={[
                styles.statLabel,
                isSmallScreen && styles.statLabelSmall
              ]}>Medium</Text>
            </View>
          </View>
        </View>

        {/* Alerts List */}
        {overdueVisitors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubtext}>
              No visitors have been checked in for more than 12 hours
            </Text>
          </View>
        ) : (
          <FlatList
            data={overdueVisitors.sort((a, b) => getHoursOverdue(b.timeIn) - getHoursOverdue(a.timeIn))}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => <OverdueVisitorCard visitor={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#EF4444']}
                tintColor="#EF4444"
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
    backgroundColor: '#EF4444',
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
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 15,
    color: '#FECACA',
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
  alertCountBadge: {
    backgroundColor: '#FFFFFF20',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCountBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  alertCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertCountTextSmall: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardSmall: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryTitleSmall: {
    fontSize: 18,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
    fontSize: 16,
  },
  criticalValue: {
    color: '#EF4444',
  },
  highValue: {
    color: '#F59E0B',
  },
  mediumValue: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statLabelSmall: {
    fontSize: 9,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    paddingBottom: 20,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
  },
  alertCardSmall: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  nameContainer: {
    flex: 1,
  },
  alertName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  alertNameSmall: {
    fontSize: 18,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vehicleBadge: {
    backgroundColor: '#DBEAFE',
  },
  footBadge: {
    backgroundColor: '#D1FAE5',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  alertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertDetails: {
    marginBottom: 16,
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  timeText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    flex: 1,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  alertLevelText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hoursText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
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
  },
});