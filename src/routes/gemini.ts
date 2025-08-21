import { Hono } from 'hono';
import { authMiddleware } from '../middleware/middleware.js';

const geminiSummary = new Hono();

geminiSummary.post('/', authMiddleware, async c => {
  try {
    const user = c.get('user');
    let summaryData;
    try {
      summaryData = await c.req.json();
    } catch (e) {
      return c.json(
        {
          success: false,
          error: 'Invalid JSON body',
          message: e instanceof Error ? e.message : 'Unknown error',
        },
        400
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: 'Gemini API key not set',
        },
        500
      );
    }

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Summarize the following content:\n${summaryData.content || JSON.stringify(summaryData)}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return c.json(
        {
          success: false,
          error: 'Failed to get summary from Gemini',
          message: errorText,
        },
        500
      );
    }

    const geminiJson = await geminiRes.json();
    const summary =
      geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No summary generated.';

    return c.json(
      {
        success: true,
        data: { userId: user.userId, summary },
        message: 'Summary generated successfully',
      },
      201
    );
  } catch (error) {
    console.error('Error receiving summary:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to receive summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default geminiSummary;
