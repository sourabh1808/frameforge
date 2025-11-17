import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const SYSTEM_PROMPT = `You are an expert in the Manim animation library (latest version). Your task is to generate Python code for Manim animations based on user prompts.

CRITICAL RULES:
1. You MUST output ONLY valid, executable Python code - no markdown, no explanations, no comments outside the code
2. The code MUST use Python, as Manim is a Python library
3. Import all necessary classes from manim at the top
4. Define a SINGLE class called "PromptAnimation" that inherits from Scene
5. The class MUST contain a construct(self) method with all animation logic
6. Use standard Manim objects: Circle, Square, Text, Arrow, Dot, Line, etc.
7. Use standard Manim animations: Write, FadeIn, FadeOut, Create, Transform, MoveAlongPath, Rotate, etc.
8. Keep animations clear, concise, and focused on the user's request
9. Always call self.wait() at the end to hold the final frame
10. DO NOT include any text before or after the Python code block

Example output format:
from manim import *

class PromptAnimation(Scene):
    def construct(self):
        circle = Circle(color=BLUE, fill_opacity=0.5)
        self.play(Create(circle))
        self.wait()`;

export const generateManimCode = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    let code = response.text();

    code = code.replace(/```python\n?/g, '').replace(/```\n?/g, '').trim();

    if (!code.includes('class PromptAnimation(Scene):')) {
      throw new Error('Generated code does not contain required PromptAnimation class');
    }

    if (!code.includes('def construct(self):')) {
      throw new Error('Generated code does not contain required construct method');
    }

    return code;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error(`Failed to generate Manim code: ${error.message}`);
  }
};
