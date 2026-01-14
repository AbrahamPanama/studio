import { z } from 'zod';

export const employeeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d+$/, 'PIN must be numeric'),
    photoUrl: z.string().url('Invalid photo URL').min(1, 'Photo is required'),
    isActive: z.boolean().default(true),
    joinedAt: z.date().optional(), // Usually set on server/creation
});

export const timeEntrySchema = z.object({
    employeeId: z.string().min(1),
    employeeName: z.string().min(1),
    type: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
    timestamp: z.date(),
    method: z.enum(['FACE', 'PIN']),
    snapshotUrl: z.string().url().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
