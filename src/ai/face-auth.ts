
import { z } from 'zod';
import { ai } from './genkit';

export const verifyFace = ai.defineFlow(
    {
        name: 'verifyFace',
        inputSchema: z.object({
            referenceImage: z.string().describe('URL of the reference photo'),
            kioskImage: z.string().describe('Base64 data or URL of the live capture'),
        }),
        outputSchema: z.object({
            isMatch: z.boolean(),
            confidence: z.number().describe('Confidence score between 0 and 100'),
            reasoning: z.string().optional().describe('Explanation for the decision'),
        }),
    },
    async (input) => {
        const { output } = await ai.generate({
            prompt: [
                { text: "You are performing biometric face verification for a workplace time clock system. Compare the person in the REFERENCE image (first image) with the person in the LIVE CAPTURE (second image). Focus ONLY on key facial features: face shape, eye spacing and shape, nose structure, mouth shape, and eyebrow positioning. IGNORE completely: lighting differences, image quality/resolution differences, background, clothing, minor facial hair changes, glasses, head angle variations up to 30 degrees. Return `isMatch: true` if your confidence that this is the same person is 45% or higher. Be reasonably lenient since this is for workplace convenience, not high-security access." },
                { media: { url: input.referenceImage, contentType: 'image/jpeg' } },
                { media: { url: input.kioskImage, contentType: 'image/jpeg' } }
            ],
            output: {
                schema: z.object({
                    isMatch: z.boolean(),
                    confidence: z.number(),
                    reasoning: z.string().optional()
                })
            },
        });

        if (!output) {
            throw new Error("Failed to get a response from the AI model for face verification.");
        }

        return output;
    }
);
