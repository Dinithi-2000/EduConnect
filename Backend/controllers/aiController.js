const {
  retrieveKnowledge,
  addKnowledgeEntry,
  appendChatHistory,
  getChatHistory
} = require('../utils/platformStore');

const SYSTEM_PROMPT = `You are EduConnect Assistant, a helpful AI tutor for students.
Rules:
- Keep answers concise, practical, and friendly.
- Use bullet points when useful.
- Prioritize the supplied knowledge context when available.
- Suggest relevant resources/quizzes/Kuppi sessions when appropriate.
- If asked outside education/platform help, answer briefly and steer back to learning support.`;

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

const isUsableApiKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;

  const lowered = raw.toLowerCase();
  const placeholderPatterns = ['your_', '_here', 'change_me', 'replace_me', 'example'];
  return !placeholderPatterns.some((token) => lowered.includes(token));
};

const getGeminiModelCandidates = (primaryModel) => {
  const fromEnv = String(process.env.GEMINI_MODEL_FALLBACKS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
  return [primaryModel, ...fromEnv, ...defaults].filter((model, idx, arr) => model && arr.indexOf(model) === idx);
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

const askGeminiWithFallbackModels = async ({ message, history, apiKey, primaryModel }) => {
  const models = getGeminiModelCandidates(primaryModel);
  let lastError = '';

  for (const model of models) {
    try {
      const reply = await askGemini({ message, history, apiKey, model });
      return { reply, model };
    } catch (error) {
      lastError = error.message;
    }
  }

  throw new Error(lastError || 'Gemini request failed for all candidate models');
};

const formatContextBlock = ({ context, knowledge }) => {
  const activityLine = Array.isArray(context?.recentActivities)
    ? context.recentActivities.join(', ')
    : '';
  const performance = context?.performanceSummary || '';

  const knowledgeLines = (knowledge || []).map((item, index) => {
    const resourceList = Array.isArray(item.resources) && item.resources.length
      ? `Resources: ${item.resources.join(', ')}`
      : 'Resources: none';
    return `Doc ${index + 1}: ${item.question}\nAnswer: ${item.answer}\n${resourceList}`;
  });

  return `Student Context:
Current course: ${context?.currentCourse || 'Not provided'}
Recent activities: ${activityLine || 'Not provided'}
Performance: ${performance || 'Not provided'}

Retrieved Knowledge:
${knowledgeLines.length ? knowledgeLines.join('\n\n') : 'No relevant internal knowledge found.'}`;
};

const buildSuggestions = ({ context, knowledge }) => {
  const suggested = new Set();

  (knowledge || []).forEach((item) => {
    (item.resources || []).forEach((resource) => suggested.add(resource));
  });

  if (context?.currentCourse) {
    suggested.add(`${context.currentCourse} focused quiz set`);
    suggested.add(`${context.currentCourse} Kuppi session`);
  }

  return Array.from(suggested).slice(0, 4);
};

const askAI = async (req, res) => {
  try {
    const { message, history, context, studentId = 'guest-student' } = req.body || {};

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

    await appendChatHistory({
      studentId,
      role: 'user',
      content: trimmedMessage,
      metadata: { context: context || {} }
    });

    const persistedHistory = await getChatHistory({ studentId, limit: 12 });
    const mergedHistory = Array.isArray(history) && history.length
      ? history
      : persistedHistory.map((item) => ({ role: item.role, content: item.content }));

    const knowledge = await retrieveKnowledge({
      query: trimmedMessage,
      context: context || {},
      limit: 3
    });
    const suggestions = buildSuggestions({ context: context || {}, knowledge });

    if (knowledge[0]?.score >= 8) {
      const knowledgeReply = `${knowledge[0].answer}${suggestions.length ? `\n\nRecommended next:\n- ${suggestions.join('\n- ')}` : ''}`;
      await appendChatHistory({
        studentId,
        role: 'assistant',
        content: knowledgeReply,
        metadata: { source: 'knowledge-base', suggestions }
      });

      return res.json({
        success: true,
        reply: knowledgeReply,
        source: 'knowledge-base',
        suggestions,
        contextUsed: Boolean(context)
      });
    }

    const provider = String(process.env.AI_PROVIDER || "auto").toLowerCase();
    const openAIKey = process.env.OPENAI_API_KEY;
    const openAIModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    const validOpenAIKey = isUsableApiKey(openAIKey) ? openAIKey : '';
    const validGeminiKey = isUsableApiKey(geminiKey) ? geminiKey : '';

    if (!validOpenAIKey && !validGeminiKey) {
      return res.json({
        success: true,
        reply: buildFallbackReply(trimmedMessage),
        source: "fallback",
        suggestions,
        contextUsed: Boolean(context)
      });
    }

    const canUseGemini = Boolean(validGeminiKey);
    const canUseOpenAI = Boolean(validOpenAIKey);
    const preferGemini = provider === "gemini" || (provider === "auto" && canUseGemini);
    const preferOpenAI = provider === "openai" || (provider === "auto" && !canUseGemini && canUseOpenAI);

    let reply = "";
    let source = "";
    const groundedPrompt = `${formatContextBlock({ context: context || {}, knowledge })}

Student question: ${trimmedMessage}

Answer using only relevant details from student context and retrieved knowledge when possible. If missing data, state assumptions briefly.`;

    const attempts = [];
    if (preferGemini && canUseGemini) attempts.push('gemini');
    if (preferOpenAI && canUseOpenAI) attempts.push('openai');
    if (canUseGemini && !attempts.includes('gemini')) attempts.push('gemini');
    if (canUseOpenAI && !attempts.includes('openai')) attempts.push('openai');

    let lastProviderError = '';

    for (const attempt of attempts) {
      try {
        if (attempt === 'gemini') {
          const geminiResult = await askGeminiWithFallbackModels({
            message: groundedPrompt,
            history: mergedHistory,
            apiKey: validGeminiKey,
            primaryModel: geminiModel
          });
          reply = geminiResult.reply;
          source = 'gemini';
          break;
        }

        if (attempt === 'openai') {
          reply = await askOpenAI({
            message: groundedPrompt,
            history: mergedHistory,
            apiKey: validOpenAIKey,
            model: openAIModel
          });
          source = 'openai';
          break;
        }
      } catch (providerError) {
        lastProviderError = providerError.message;
      }
    }

    if (!reply) {
      const hasAuthError = /invalid|key|auth|unauthorized|forbidden/i.test(lastProviderError || '');
      const hasRateLimitError = /429|too many requests|quota|rate limit|resource_exhausted/i.test(lastProviderError || '');
      const reason = hasAuthError
        ? 'provider credentials are not configured correctly'
        : hasRateLimitError
          ? 'provider quota/rate limit has been reached'
          : 'provider is temporarily unavailable';
      reply = `${buildFallbackReply(trimmedMessage)}\n\nNote: Live AI response is unavailable right now because ${reason}.`;
      source = 'fallback';
    }

    await appendChatHistory({
      studentId,
      role: 'assistant',
      content: reply,
      metadata: { source, suggestions }
    });

    return res.json({
      success: true,
      reply,
      source,
      suggestions,
      contextUsed: Boolean(context)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "AI chat failed",
      error: error.message
    });
  }
};

const trainKnowledge = async (req, res) => {
  try {
    const { question, answer, aliases, tags, resources } = req.body || {};

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'question and answer are required'
      });
    }

    const result = await addKnowledgeEntry({
      question,
      answer,
      aliases,
      tags,
      resources
    });

    return res.status(201).json({
      success: true,
      message: 'Knowledge entry added',
      data: result.entry,
      count: result.count
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to train knowledge base',
      error: error.message
    });
  }
};

const getStudentHistory = async (req, res) => {
  try {
    const studentId = req.params.studentId || 'guest-student';
    const items = await getChatHistory({ studentId, limit: 40 });
    return res.json({
      success: true,
      studentId,
      count: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
};

module.exports = {
  askAI,
  trainKnowledge,
  getStudentHistory
};
