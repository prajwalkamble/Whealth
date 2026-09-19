import { GoogleGenerativeAI } from "@google/generative-ai";

// The one place the model is named. The receipt scanner and the monthly
// insights each hard-coded "gemini-1.5-flash"; when Google retired it both
// broke at once, and the insights quietly fell back to the same canned text
// every month. Change the model here and nowhere else.
export const GEMINI_MODEL = "gemini-3.8-flash";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 503 ("model is currently experiencing high demand") is routine and clears
// within seconds. Without a retry, one of them on the 1st of the month sends
// the fallback insights, which is indistinguishable from the model being gone.
// 429 is deliberately not retried: it means a quota is spent (the free tier
// allows 20 requests a day per model), and retrying a second later only burns
// time. Anything else -- a bad key, a missing model -- also fails immediately.
const RETRYABLE_STATUS = new Set([500, 503]);
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContent(request) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  for (let attempt = 1; ; attempt++) {
    try {
      const result = await model.generateContent(request);
      return result.response.text();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !RETRYABLE_STATUS.has(error.status)) {
        throw error;
      }
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
}
