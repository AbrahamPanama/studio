
import { z } from 'zod';
import { ai } from './genkit';

/**
 * Detect content type from a URL or data URL
 */
function getContentType(url: string): string {
    if (url.startsWith('data:')) {
        // Extract content type from data URL: data:image/jpeg;base64,...
        const match = url.match(/^data:([^;,]+)/);
        return match ? match[1] : 'image/jpeg';
    }
    // For regular URLs, assume JPEG
    return 'image/jpeg';
}

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
        const refContentType = getContentType(input.referenceImage);
        const kioskContentType = getContentType(input.kioskImage);

        console.log('[FaceAuth] Reference image type:', refContentType, 'URL prefix:', input.referenceImage.slice(0, 60));
        console.log('[FaceAuth] Kiosk image type:', kioskContentType, 'URL prefix:', input.kioskImage.slice(0, 60));

        const { output } = await ai.generate({
            prompt: [
                {
                    text: `Biometric face verification task. 

QUESTION: Is this the SAME PERSON in both images?

IMAGE 1 (Reference Photo): Employee's stored photo
IMAGE 2 (Live Capture): Webcam photo just taken

INSTRUCTIONS:
- Compare ONLY the face, not background, lighting, or image quality
- People can look different day-to-day (lighting, angle, expression)  
- Focus on: face shape, eyes, nose, mouth
- Be LENIENT - this is a convenience feature, not high security
- If there's ANY reasonable chance it's the same person, say YES

Return isMatch: true if confidence >= 15%
Provide your confidence as a percentage (0-100)
Explain your reasoning briefly` },
                { media: { url: input.referenceImage, contentType: refContentType } },
                { media: { url: input.kioskImage, contentType: kioskContentType } }
            ],
            output: {
                schema: z.object({
                    isMatch: z.boolean(),
                    confidence: z.number(),
                    reasoning: z.string().optional()
                })
            },
        });

        console.log('[FaceAuth] AI Response:', output);

        if (!output) {
            throw new Error("Failed to get a response from the AI model for face verification.");
        }

        return output;
    }
);
