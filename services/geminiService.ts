import { GoogleGenAI } from "@google/genai";
import { Commit, GenerationConfig } from '../types';

// Initialize the Gemini client
// API Key is guaranteed to be in process.env.API_KEY by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDocumentation = async (
  commits: Commit[],
  config: GenerationConfig
): Promise<string> => {
  const model = "gemini-2.5-flash";

  // Construct the prompt
  const commitContext = commits.map((c, i) => `
--- COMMIT ${i + 1} ---
Hash: ${c.hash}
Message: ${c.message}
Author: ${c.author || 'Unknown'}
Date: ${c.date || 'Unknown'}
Diff/Changes:
${c.diff.substring(0, 15000)} 
(truncated if too long)
-----------------------
`).join('\n');

  let taskDescription = `
You are a world-class Technical Writer. Your task is to write comprehensive, developer-friendly documentation for a software feature based on the provided git commits.
The documentation should be in Markdown format.
  `;

  if (config.previousDocContent) {
    taskDescription += `
\nIMPORTANT: You have been provided with an EXISTING DOCUMENTATION file. 
Your goal is to UPDATE this existing documentation to reflect the changes introduced by the new commits.
Maintain the style and structure of the original document where possible, but add new sections or modify existing ones as needed.
    `;
  } else {
    taskDescription += `
\nSince no previous documentation was provided, create a brand new documentation file.
Structure it with the following sections:
1. **Title**: A clear, concise title for the feature/change.
2. **Overview**: High-level summary of what changed and why.
3. **Key Changes**: Bullet points of technical details.
4. **Usage**: Code examples or instructions on how to use the new feature.
5. **Configuration/Setup**: (If applicable)
    `;
  }

  const prompt = `
${taskDescription}

User Provided Extra Context:
"${config.extraInfo || 'N/A'}"

User Provided Setup Instructions (incorporate this exactly if present):
"${config.setupInstructions || 'N/A'}"

Previous Documentation Content:
${config.previousDocContent ? `\`\`\`markdown\n${config.previousDocContent}\n\`\`\`` : "None"}

Commits to Process:
${commitContext}

Output the final Markdown only. Do not wrap in JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert software documentation generator. You are precise, clear, and thorough.",
        temperature: 0.4, // Lower temperature for more factual documentation
      }
    });

    return response.text || "# Error: No content generated.";
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return `# Generation Failed\n\nAn error occurred while communicating with the AI: ${error.message}`;
  }
};