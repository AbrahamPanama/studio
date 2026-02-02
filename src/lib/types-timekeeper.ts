// Defines the structure for an employee in the timekeeper system
export interface Employee {
    id: string;
    name: string;
    pin: string;
    photoUrl: string;
    isActive: boolean;
    joinedAt: Date; // Firestore Timestamp converted to Date
}

// Defines a single time entry (clock in or clock out)
export interface TimeEntry {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'CLOCK_IN' | 'CLOCK_OUT';
    timestamp: Date; // Firestore Timestamp converted to Date
    method: 'FACE' | 'PIN' | 'ADMIN' | 'RECOVERY';
    snapshotUrl?: string; // Optional URL if a photo was taken
    isDeleted?: boolean;
}
