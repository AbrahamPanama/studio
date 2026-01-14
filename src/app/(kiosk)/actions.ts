'use server';

import { verifyFace } from '@/ai/face-auth';
import { z } from 'zod';

// We wrap the Genkit flow in a Server Action to make it callable from the Client Component
export async function verifyEmployeeFace(referenceImage: string, kioskImage: string) {
    try {
        const result = await verifyFace({
            referenceImage,
            kioskImage,
        });
        return result;
    } catch (error) {
        console.error("Face Verification Error:", error);
        return {
            isMatch: false,
            confidence: 0,
            reasoning: "System error during verification",
        };
    }
}
