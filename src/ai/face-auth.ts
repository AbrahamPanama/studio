
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
                { text: "Carefully compare the person in the reference image with the person in the live capture. Ignore lighting and background differences. Your task is to determine if they are the same person. Return `isMatch: true` ONLY if your confidence is greater than 60%." },
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
