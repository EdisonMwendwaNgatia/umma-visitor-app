export interface Visitor {
  id?: string;
  visitorName: string;
  phoneNumber: string;
  idNumber: string;
  refNumber?: string; // For vehicles only
  residence: string;
  institutionOccupation: string;
  purposeOfVisit: string;
  gender: string; // Added gender field
  tagNumber?: string; // Added tag number field
  tagNotGiven?: boolean; // Added tag not given flag
  timeIn: Date;
  timeOut?: Date;
  signIn?: string; // Base64 signature or URL
  signOut?: string; // Base64 signature or URL
  visitorType: 'foot' | 'vehicle';
  checkedInBy: string; // User ID who checked in the visitor
  checkedOutBy?: string; // User ID who checked out the visitor
  isCheckedOut: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'user' | 'admin';
  createdAt?: Date;
  lastLoginAt?: Date;
  platform?: 'web' | 'mobile';
  isOnline?: boolean;
  lastSeen?: Date | null;
  deviceInfo?: string;
}

export interface UserPresence {
  uid: string;
  state: 'online' | 'offline' | 'away';
  lastChanged: Date;
  platform: string;
  deviceInfo?: string;
}