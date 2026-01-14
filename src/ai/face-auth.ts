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
        const promptText = `
      Act as a biometric security system. 
      Compare the person in Image A (Reference) with Image B (Live Capture). 
      Ignore lighting/background differences. 
      
      Image A (Reference): ${input.referenceImage}
      Image B (Live Capture): ${input.kioskImage}
      
      Strictly evaluate if they are the same person.
      Return JSON with:
      - isMatch: true ONLY if confidence > 85%
      - confidence: matching probability (0-100)
      - reasoning: brief explanation
    `;

        // Note: In a real multi-modal setup, we would pass image parts. 
        // For this prompt-based flow, we assume the model can handle URLs/Base64 in text 
        // or we rely on the multimodal capabilities if we were constructing a Part array.
        // Given the simple instruction, we'll try to use the generate helper.

        // However, since we are sending image data (potentially base64), it's best to use the structured prompt if the model supports it.
        // For 'googleai/gemini-2.5-flash', passing images as parts is the way.

        const { output } = await ai.generate({
            prompt: [
                { text: "Act as a biometric security system. Compare the person in Image A (Reference) with Image B (Live Capture). Ignore lighting/background. Return isMatch: true ONLY if confidence > 85%." },
                { media: { url: input.referenceImage } },
                { media: { url: input.kioskImage } }
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
            throw new Error("Failed to verify face");
        }

        return output;
    }
);
