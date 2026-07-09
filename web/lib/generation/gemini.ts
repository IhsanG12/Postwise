export async function callGeminiJSON(prompt: string, model = "gemini-flash-lite-latest"): Promise<unknown> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  // "gemini-1.5-flash" was fully retired (confirmed via ListModels — it's
  // not in the current catalog at all). Using the "-latest" alias instead
  // of a pinned version this time, so Google's model rotation doesn't
  // silently break this again the way it did here.
  const genModel = genAI.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  const raw = result.response.text().trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(raw);
}
