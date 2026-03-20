const SYSTEM_PROMPT = `You are EduConnect Assistant, a helpful AI tutor for students. Keep answers concise, practical, and friendly. Use bullet points when useful. If asked outside education/student productivity, still answer briefly and steer back to learning support.`;

const buildFallbackReply = (message) => {
  const input = String(message || "").toLowerCase();

  if (input.includes("exam") || input.includes("study") || input.includes("revision")) {
    return "Great question. Try this quick exam plan:\n1. Split topics into daily blocks.\n2. Use 25-minute focused sessions with 5-minute breaks.\n3. End each day with 10 mixed recall questions.\n4. Track weak topics and revisit after 48 hours.";
  }

  if (input.includes("time") || input.includes("schedule") || input.includes("plan")) {
    return "A practical study schedule:\n- Deep work: 2 sessions/day (45 to 60 min each)\n- Light review: 1 session/day (20 min)\n- Weekly reflection: 30 min on Sunday\nWant me to generate a plan using your subjects?";
  }

  if (input.includes("motivation") || input.includes("stress") || input.includes("burnout")) {
    return "You're not alone. Try this reset:\n- Pick one tiny task (10 minutes).\n- Remove distractions before starting.\n- Reward completion with a short break.\nSmall wins create momentum. I can also help you make a low-stress study routine.";
  }

  return "I can help with study plans, topic explanations, quizzes, and productivity tips. Ask me something like: 'Create a 7-day data structures revision plan'.";
};

const toOpenAIHistory = (history = []) => {
  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
    .slice(-10)
    .map((item) => ({ role: item.role, content: String(item.content) }));
};

const toGeminiContents = (history = [], message = "") => {
  const normalizedHistory = history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
    .slice(-10)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.content) }]
    }));

  return [
    ...normalizedHistory,
    {
      role: "user",
      parts: [{ text: message }]
    }
  ];
};

const askOpenAI = async ({ message, history, apiKey, model }) => {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...toOpenAIHistory(history),
    { role: "user", content: message }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 450
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`OpenAI request failed: ${errorPayload}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenAI response was empty");
  }

  return reply;
};

const askGemini = async ({ message, history, apiKey, model }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const contents = toGeminiContents(history, message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 450
      }
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Gemini request failed: ${errorPayload}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("")
    .trim();

  if (!reply) {
    throw new Error("Gemini response was empty");
  }

  return reply;
};

const askAI = async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty"
      });
    }

    const provider = String(process.env.AI_PROVIDER || "auto").toLowerCase();
    const openAIKey = process.env.OPENAI_API_KEY;
    const openAIModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!openAIKey && !geminiKey) {
      return res.json({
        success: true,
        reply: buildFallbackReply(trimmedMessage),
        source: "fallback"
      });
    }

    const canUseGemini = Boolean(geminiKey);
    const canUseOpenAI = Boolean(openAIKey);
    const preferGemini = provider === "gemini" || (provider === "auto" && canUseGemini);
    const preferOpenAI = provider === "openai" || (provider === "auto" && !canUseGemini && canUseOpenAI);

    let reply = "";
    let source = "";

    if (preferGemini && canUseGemini) {
      reply = await askGemini({
        message: trimmedMessage,
        history,
        apiKey: geminiKey,
        model: geminiModel
      });
      source = "gemini";
    } else if (preferOpenAI && canUseOpenAI) {
      reply = await askOpenAI({
        message: trimmedMessage,
        history,
        apiKey: openAIKey,
        model: openAIModel
      });
      source = "openai";
    } else if (canUseGemini) {
      reply = await askGemini({
        message: trimmedMessage,
        history,
        apiKey: geminiKey,
        model: geminiModel
      });
      source = "gemini";
    } else {
      reply = await askOpenAI({
        message: trimmedMessage,
        history,
        apiKey: openAIKey,
        model: openAIModel
      });
      source = "openai";
    }

    return res.json({
      success: true,
      reply,
      source
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "AI chat failed",
      error: error.message
    });
  }
};

module.exports = {
  askAI
};
