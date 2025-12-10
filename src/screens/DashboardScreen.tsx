import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, Timestamp } from 'firebase/firestore';
import { Visitor } from '../types';
import { cleanupPresence, updateLastActive } from '../services/presenceService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function DashboardScreen() {
  const [stats, setStats] = useState({
    todayCheckedIn: 0,
    totalActive: 0,
    overdue: 0,
    totalVisitors: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]);

  const handleSignOut = async () => {
    try {
      // Clean up presence before signing out
      await cleanupPresence();
      
      await signOut(auth);
      console.log('User signed out successfully');
      // Navigation to login will be handled automatically by your navigation stack
      // or auth state listener
    } catch (error: any) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out: ' + error.message);
    }
  };

  const toJsDate = (value: any): Date => {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value.toDate) return value.toDate();
    return new Date(value);
  };

  const fetchData = () => {
    const visitorsQuery = query(collection(db, 'visitors'));

    const unsubscribe = onSnapshot(visitorsQuery, (snapshot) => {
      const visitorsData: Visitor[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        visitorsData.push({
          id: doc.id,
          ...data,
          timeIn: toJsDate(data.timeIn)
        } as Visitor);
      });

      setAllVisitors(visitorsData);
      calculateStats(visitorsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching visitors:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchData();
    
    // Set up activity tracking to update last active
    const activityInterval = setInterval(() => {
      updateLastActive();
    }, 30000); // Update every 30 seconds
    
    return () => {
      unsubscribe();
      clearInterval(activityInterval);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const calculateStats = (visitors: Visitor[]) => {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let todayCheckedIn = 0;
    let totalActive = 0;
    let overdue = 0;

    visitors.forEach((visitor) => {
      const timeIn = visitor.timeIn;

      if (timeIn >= startOfDay) {
        todayCheckedIn++;
      }

      if (!visitor.isCheckedOut) {
        totalActive++;

        if (timeIn < startOfDay) {
          overdue++;
        }
      }
    });

    setStats({
      todayCheckedIn,
      totalActive,
      overdue,
      totalVisitors: visitors.length,
    });
  };

  const StatCard = ({
    title,
    value,
    color,
    subtitle,
    icon,
  }: {
    title: string;
    value: number;
    color: string;
    subtitle?: string;
    icon: string;
  }) => (
    <View style={[
      styles.statCard,
      isSmallScreen && styles.statCardSmall
    ]}>
      <View style={[
        styles.iconBadge,
        { backgroundColor: color + '20' },
        isSmallScreen && styles.iconBadgeSmall
      ]}>
        <Text style={[
          styles.statIcon,
          isSmallScreen && styles.statIconSmall
        ]}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={[
          styles.statValue,
          isSmallScreen && styles.statValueSmall
        ]}>{value}</Text>
        <Text style={[
          styles.statTitle,
          isSmallScreen && styles.statTitleSmall
        ]}>{title}</Text>
        {subtitle && (
          <Text style={[
            styles.statSubtitle,
            isSmallScreen && styles.statSubtitleSmall
          ]}>{subtitle}</Text>
        )}
      </View>
      <View style={[styles.statIndicator, { backgroundColor: color }]} />
    </View>
  );

  const getRecentVisitors = () => {
    return allVisitors
      .sort((a, b) => b.timeIn.getTime() - a.timeIn.getTime())
      .slice(0, 5);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingIcon}>⏳</Text>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
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
            ]}>Welcome Back</Text>
            <Text style={[
              styles.headerTitle,
              isSmallScreen && styles.headerTitleSmall
            ]}>Dashboard</Text>
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

      {/* Stats Grid */}
      <View style={[
        styles.statsGridHorizontal,
        isSmallScreen && styles.statsGridHorizontalSmall
      ]}>
        <StatCard
          title="Today"
          value={stats.todayCheckedIn}
          color="#10B981"
          subtitle="Check-ins"
          icon="📊"
        />
        <StatCard
          title="Active"
          value={stats.totalActive}
          color="#059669"
          subtitle="Visitors"
          icon="✅"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          color="#EF4444"
          subtitle="Alerts"
          icon="⚠️"
        />
      </View>

      {/* Total Visitors Card */}
      <View style={[
        styles.totalCard,
        isSmallScreen && styles.totalCardSmall
      ]}>
        <View style={styles.totalCardHeader}>
          <View style={styles.totalCardText}>
            <Text style={[
              styles.totalCardLabel,
              isSmallScreen && styles.totalCardLabelSmall
            ]}>Total Visitors</Text>
            <Text style={[
              styles.totalCardValue,
              isSmallScreen && styles.totalCardValueSmall
            ]}>{stats.totalVisitors}</Text>
            <Text style={[
              styles.totalCardSubtitle,
              isSmallScreen && styles.totalCardSubtitleSmall
            ]}>All time visitors in system</Text>
          </View>
          <View style={[
            styles.totalIconContainer,
            isSmallScreen && styles.totalIconContainerSmall
          ]}>
            <Text style={[
              styles.totalIcon,
              isSmallScreen && styles.totalIconSmall
            ]}>👥</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={[
        styles.quickStatsCard,
        isSmallScreen && styles.quickStatsCardSmall
      ]}>
        <Text style={[
          styles.sectionTitle,
          isSmallScreen && styles.sectionTitleSmall
        ]}>Quick Stats</Text>
        <View style={[
          styles.quickStatsGrid,
          isSmallScreen && styles.quickStatsGridSmall
        ]}>
          <View style={styles.quickStatItem}>
            <View style={[
              styles.quickStatBadge,
              isSmallScreen && styles.quickStatBadgeSmall
            ]}>
              <Text style={[
                styles.quickStatIcon,
                isSmallScreen && styles.quickStatIconSmall
              ]}>🚗</Text>
            </View>
            <Text style={[
              styles.quickStatValue,
              isSmallScreen && styles.quickStatValueSmall
            ]}>
              {allVisitors.filter(v => v.visitorType === 'vehicle').length}
            </Text>
            <Text style={[
              styles.quickStatLabel,
              isSmallScreen && styles.quickStatLabelSmall
            ]}>Vehicle</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View style={[
              styles.quickStatBadge,
              isSmallScreen && styles.quickStatBadgeSmall
            ]}>
              <Text style={[
                styles.quickStatIcon,
                isSmallScreen && styles.quickStatIconSmall
              ]}>🚶</Text>
            </View>
            <Text style={[
              styles.quickStatValue,
              isSmallScreen && styles.quickStatValueSmall
            ]}>
              {allVisitors.filter(v => v.visitorType === 'foot').length}
            </Text>
            <Text style={[
              styles.quickStatLabel,
              isSmallScreen && styles.quickStatLabelSmall
            ]}>Foot</Text>
          </View>
          <View style={styles.quickStatItem}>
            <View style={[
              styles.quickStatBadge,
              isSmallScreen && styles.quickStatBadgeSmall
            ]}>
              <Text style={[
                styles.quickStatIcon,
                isSmallScreen && styles.quickStatIconSmall
              ]}>✔️</Text>
            </View>
            <Text style={[
              styles.quickStatValue,
              isSmallScreen && styles.quickStatValueSmall
            ]}>
              {allVisitors.filter(v => v.isCheckedOut).length}
            </Text>
            <Text style={[
              styles.quickStatLabel,
              isSmallScreen && styles.quickStatLabelSmall
            ]}>Checked Out</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[
        styles.activityCard,
        isSmallScreen && styles.activityCardSmall
      ]}>
        <View style={styles.sectionHeader}>
          <Text style={[
            styles.sectionTitle,
            isSmallScreen && styles.sectionTitleSmall
          ]}>Recent Activity</Text>
          <Text style={styles.seeAllText}>See All</Text>
        </View>
        <View style={styles.activityList}>
          {getRecentVisitors().length > 0 ? (
            getRecentVisitors().map((visitor, index) => (
              <View
                key={visitor.id}
                style={[
                  styles.activityItem,
                  isSmallScreen && styles.activityItemSmall,
                  index !== getRecentVisitors().length - 1 && styles.activityItemBorder
                ]}
              >
                <View style={styles.activityLeft}>
                  <View style={[
                    styles.activityStatusDot,
                    { backgroundColor: visitor.isCheckedOut ? '#9CA3AF' : '#10B981' }
                  ]} />
                  <View style={[
                    styles.activityDetails,
                    isSmallScreen && styles.activityDetailsSmall
                  ]}>
                    <Text style={[
                      styles.activityName,
                      isSmallScreen && styles.activityNameSmall
                    ]}>{visitor.visitorName}</Text>
                    <Text style={[
                      styles.activityInfo,
                      isSmallScreen && styles.activityInfoSmall
                    ]}>
                      📞 {visitor.phoneNumber}
                    </Text>
                    <Text style={[
                      styles.activityTime,
                      isSmallScreen && styles.activityTimeSmall
                    ]}>
                      {visitor.timeIn.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  isSmallScreen && styles.statusBadgeSmall,
                  visitor.isCheckedOut ? styles.statusCheckedOut : styles.statusActive
                ]}>
                  <Text style={[
                    styles.statusText,
                    isSmallScreen && styles.statusTextSmall,
                    visitor.isCheckedOut ? styles.statusTextOut : styles.statusTextActive
                  ]}>
                    {visitor.isCheckedOut ? 'Out' : 'Active'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No visitors yet</Text>
              <Text style={styles.emptySubtext}>Check-ins will appear here</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={[
        styles.signOutCard,
        isSmallScreen && styles.signOutCardSmall
      ]}>
        <TouchableOpacity 
          style={[
            styles.signOutButton,
            isSmallScreen && styles.signOutButtonSmall
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.signOutIcon,
            isSmallScreen && styles.signOutIconSmall
          ]}>🚪</Text>
          <Text style={[
            styles.signOutText,
            isSmallScreen && styles.signOutTextSmall
          ]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  statsGrid: {
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statsGridHorizontal: {
    paddingHorizontal: 16,
    marginTop: -20,
    flexDirection: 'row',
    gap: 12,
  },
  statsGridHorizontalSmall: {
    marginTop: -15,
    gap: 8,
  },
  statsGridSmall: {
    marginTop: -15,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    flex: 1,
    minHeight: 120,
  },
  statCardSmall: {
    padding: 12,
    borderRadius: 14,
    minHeight: 100,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadgeSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 22,
  },
  statIconSmall: {
    fontSize: 18,
  },
  statContent: {
    flex: 1,
    width: '100%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 20,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  statTitleSmall: {
    fontSize: 12,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statSubtitleSmall: {
    fontSize: 10,
  },
  statIndicator: {
    width: '100%',
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  totalCard: {
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  totalCardSmall: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  totalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCardText: {
    flex: 1,
  },
  totalCardLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    fontWeight: '600',
    marginBottom: 4,
  },
  totalCardLabelSmall: {
    fontSize: 12,
  },
  totalCardValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  totalCardValueSmall: {
    fontSize: 28,
  },
  totalCardSubtitle: {
    fontSize: 13,
    color: '#D1FAE5',
  },
  totalCardSubtitleSmall: {
    fontSize: 11,
  },
  totalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalIconContainerSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  totalIcon: {
    fontSize: 24,
  },
  totalIconSmall: {
    fontSize: 20,
  },
  quickStatsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickStatsCardSmall: {
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionTitleSmall: {
    fontSize: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatsGridSmall: {
    gap: 8,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatBadgeSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  quickStatIcon: {
    fontSize: 24,
  },
  quickStatIconSmall: {
    fontSize: 20,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  quickStatValueSmall: {
    fontSize: 18,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  quickStatLabelSmall: {
    fontSize: 10,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  activityCardSmall: {
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  activityList: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  activityItemSmall: {
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  activityDetails: {
    flex: 1,
  },
  activityDetailsSmall: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityNameSmall: {
    fontSize: 14,
  },
  activityInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  activityInfoSmall: {
    fontSize: 11,
  },
  activityTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  activityTimeSmall: {
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusCheckedOut: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextSmall: {
    fontSize: 10,
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextOut: {
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  signOutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutCardSmall: {
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  signOutButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signOutButtonSmall: {
    paddingVertical: 14,
    borderRadius: 10,
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  signOutIconSmall: {
    fontSize: 18,
    marginRight: 6,
  },
  signOutText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutTextSmall: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 20,
  },
});