'use server';

import { verifyFace } from '@/ai/face-auth';
import { z } from 'zod';

// We wrap the Genkit flow in a Server Action to make it callable from the Client Component
export async function verifyEmployeeFace(referenceImage: string, kioskImage: string) {
    try {
        console.log(`Verifying face for ${referenceImage.slice(0, 50)}... vs ${kioskImage.slice(0, 50)}...`);

        // Add a 30-second timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Verification timed out")), 30000)
        );

        const result = await Promise.race([
            verifyFace({
                referenceImage,
                kioskImage,
            }),
            timeoutPromise
        ]) as { isMatch: boolean; confidence: number; reasoning?: string };

        console.log("Verification result:", result);
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
