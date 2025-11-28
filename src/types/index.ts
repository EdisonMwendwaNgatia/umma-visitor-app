export interface Visitor {
  id?: string;
  visitorName: string;
  phoneNumber: string;
  idNumber: string;
  refNumber?: string; // For vehicles only
  residence: string;
  institutionOccupation: string;
  purposeOfVisit: string;
  timeIn: Date;
  timeOut?: Date;
  signIn?: string; // Base64 signature or URL
  signOut?: string; // Base64 signature or URL
  visitorType: 'foot' | 'vehicle';
  checkedInBy: string; // User ID who checked in the visitor
  isCheckedOut: boolean;
}

export interface User {
  uid: string;
  email: string;
  name: string;
}