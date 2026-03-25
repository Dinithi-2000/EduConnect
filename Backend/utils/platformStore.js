const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

const filePaths = {
  knowledgeBase: path.join(dataDir, 'knowledgeBase.json'),
  chatHistory: path.join(dataDir, 'chatHistory.json'),
  transactions: path.join(dataDir, 'transactions.json'),
  unlockedContent: path.join(dataDir, 'unlockedContent.json'),
  receiptOutbox: path.join(dataDir, 'receiptOutbox.json')
};

const defaultKnowledgeBase = [
  {
    id: 'kb-001',
    question: 'How can I prepare for exams effectively?',
    answer:
      'Use active recall and spaced repetition. Study in short focused blocks, test yourself daily, and track weak topics for revision.',
    aliases: ['exam prep', 'study for exams', 'revision strategy'],
    tags: ['study', 'exam', 'revision'],
    resources: ['Weekly Performance dashboard', 'Upcoming Kuppi sessions']
  },
  {
    id: 'kb-002',
    question: 'What is polymorphism in OOP?',
    answer:
      'Polymorphism means one interface, many forms. The same method name can show different behavior depending on the object type.',
    aliases: ['explain polymorphism', 'oop polymorphism'],
    tags: ['oop', 'programming', 'quiz'],
    resources: ['OOP quiz set', 'Kuppi: Object-Oriented Design']
  },
  {
    id: 'kb-003',
    question: 'How do I join a Kuppi session?',
    answer:
      'Open Upcoming Kuppi on the dashboard, choose a session, and set a reminder. Join from your session card at start time.',
    aliases: ['join kuppi', 'kuppi help', 'session help'],
    tags: ['platform', 'kuppi', 'help'],
    resources: ['Upcoming Kuppi panel', 'Notification bell']
  }
];

const ensureDataFile = async (filePath, defaultData) => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

const initDataFiles = async () => {
  await Promise.all([
    ensureDataFile(filePaths.knowledgeBase, defaultKnowledgeBase),
    ensureDataFile(filePaths.chatHistory, []),
    ensureDataFile(filePaths.transactions, []),
    ensureDataFile(filePaths.unlockedContent, []),
    ensureDataFile(filePaths.receiptOutbox, [])
  ]);
};

const readJson = async (filePath, fallback = []) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJson = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const tokenize = (text = '') => {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
};

const scoreKnowledgeEntry = (entry, queryText, contextText = '') => {
  const entryText = [entry.question, entry.answer, ...(entry.aliases || []), ...(entry.tags || [])]
    .join(' ')
    .toLowerCase();
  const queryTokens = tokenize(`${queryText} ${contextText}`);

  let score = 0;
  for (const token of queryTokens) {
    if (entryText.includes(token)) {
      score += 1;
    }
  }

  if (entry.question && queryText.toLowerCase().includes(entry.question.toLowerCase())) {
    score += 3;
  }

  return score;
};

const retrieveKnowledge = async ({ query, context, limit = 3 }) => {
  await initDataFiles();
  const kb = await readJson(filePaths.knowledgeBase, defaultKnowledgeBase);
  const contextText = [
    context?.currentCourse || '',
    ...(Array.isArray(context?.recentActivities) ? context.recentActivities : []),
    context?.performanceSummary || ''
  ].join(' ');

  return kb
    .map((entry) => ({
      ...entry,
      score: scoreKnowledgeEntry(entry, query, contextText)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const addKnowledgeEntry = async (payload) => {
  await initDataFiles();
  const kb = await readJson(filePaths.knowledgeBase, defaultKnowledgeBase);
  const newEntry = {
    id: payload.id || `kb-${Date.now()}`,
    question: payload.question,
    answer: payload.answer,
    aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    resources: Array.isArray(payload.resources) ? payload.resources : []
  };

  kb.push(newEntry);
  await writeJson(filePaths.knowledgeBase, kb);
  return { entry: newEntry, count: kb.length };
};

const appendChatHistory = async ({ studentId, role, content, metadata = {} }) => {
  await initDataFiles();
  const records = await readJson(filePaths.chatHistory, []);
  records.push({
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    role,
    content,
    metadata,
    createdAt: new Date().toISOString()
  });
  await writeJson(filePaths.chatHistory, records);
};

const getChatHistory = async ({ studentId, limit = 20 }) => {
  await initDataFiles();
  const records = await readJson(filePaths.chatHistory, []);
  return records
    .filter((record) => record.studentId === studentId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-limit);
};

const saveTransaction = async (transaction) => {
  await initDataFiles();
  const transactions = await readJson(filePaths.transactions, []);
  transactions.push(transaction);
  await writeJson(filePaths.transactions, transactions);
};

const unlockPremiumContent = async ({ studentId, itemId, title }) => {
  await initDataFiles();
  const unlocked = await readJson(filePaths.unlockedContent, []);
  const exists = unlocked.find((item) => item.studentId === studentId && item.itemId === itemId);
  if (!exists) {
    unlocked.push({
      id: `unlock-${Date.now()}`,
      studentId,
      itemId,
      title,
      unlockedAt: new Date().toISOString()
    });
    await writeJson(filePaths.unlockedContent, unlocked);
  }
};

const hasUnlockedContent = async ({ studentId, itemId }) => {
  await initDataFiles();
  const unlocked = await readJson(filePaths.unlockedContent, []);
  return unlocked.some((item) => item.studentId === studentId && item.itemId === itemId);
};

const queueReceiptEmail = async ({ studentId, email, transactionId, itemTitle, amount }) => {
  await initDataFiles();
  const outbox = await readJson(filePaths.receiptOutbox, []);
  outbox.push({
    id: `receipt-${Date.now()}`,
    studentId,
    email,
    transactionId,
    itemTitle,
    amount,
    queuedAt: new Date().toISOString(),
    status: 'queued'
  });
  await writeJson(filePaths.receiptOutbox, outbox);
};

module.exports = {
  initDataFiles,
  retrieveKnowledge,
  addKnowledgeEntry,
  appendChatHistory,
  getChatHistory,
  saveTransaction,
  unlockPremiumContent,
  hasUnlockedContent,
  queueReceiptEmail
};
