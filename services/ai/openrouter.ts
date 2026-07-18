const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function chatWithAI(message: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://orbit.vercel.app",
      "X-Title": "Orbit",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat-v3",
      messages: [
        {
          role: "system",
          content:
            "You are Orbit AI, an intelligent assistant inside the Orbit collaboration platform. Be concise, helpful and professional.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data.choices[0].message.content;
}
