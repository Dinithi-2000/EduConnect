const KnowledgeEntry = require('../models/KnowledgeEntry');
const ChatMessage = require('../models/ChatMessage');
const PaymentTransaction = require('../models/PaymentTransaction');
const UnlockedContent = require('../models/UnlockedContent');
const ReceiptQueueItem = require('../models/ReceiptQueueItem');

const defaultKnowledgeBase = [
  {
    question: 'How can I prepare for exams effectively?',
    answer:
      'Use active recall and spaced repetition. Study in short focused blocks, test yourself daily, and track weak topics for revision.',
    aliases: ['exam prep', 'study for exams', 'revision strategy'],
    tags: ['study', 'exam', 'revision'],
    resources: ['Weekly Performance dashboard', 'Upcoming Kuppi sessions']
  },
  {
    question: 'What is polymorphism in OOP?',
    answer:
      'Polymorphism means one interface, many forms. The same method name can show different behavior depending on the object type.',
    aliases: ['explain polymorphism', 'oop polymorphism'],
    tags: ['oop', 'programming', 'quiz'],
    resources: ['OOP quiz set', 'Kuppi: Object-Oriented Design']
  },
  {
    question: 'How do I join a Kuppi session?',
    answer:
      'Open Upcoming Kuppi on the dashboard, choose a session, and set a reminder. Join from your session card at start time.',
    aliases: ['join kuppi', 'kuppi help', 'session help'],
    tags: ['platform', 'kuppi', 'help'],
    resources: ['Upcoming Kuppi panel', 'Notification bell']
  }
];

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

const initDataFiles = async () => {
  const existingCount = await KnowledgeEntry.countDocuments();
  if (existingCount === 0) {
    await KnowledgeEntry.insertMany(defaultKnowledgeBase);
  }
};

const retrieveKnowledge = async ({ query, context, limit = 3 }) => {
  await initDataFiles();

  const kb = await KnowledgeEntry.find().lean();
  const contextText = [
    context?.currentCourse || '',
    ...(Array.isArray(context?.recentActivities) ? context.recentActivities : []),
    context?.performanceSummary || ''
  ].join(' ');

  return kb
    .map((entry) => ({
      ...entry,
      id: entry._id?.toString(),
      score: scoreKnowledgeEntry(entry, query, contextText)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const addKnowledgeEntry = async (payload) => {
  const newEntry = await KnowledgeEntry.create({
    question: payload.question,
    answer: payload.answer,
    aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    resources: Array.isArray(payload.resources) ? payload.resources : []
  });

  const count = await KnowledgeEntry.countDocuments();
  return {
    entry: {
      id: newEntry._id.toString(),
      question: newEntry.question,
      answer: newEntry.answer,
      aliases: newEntry.aliases,
      tags: newEntry.tags,
      resources: newEntry.resources
    },
    count
  };
};

const appendChatHistory = async ({ studentId, role, content, metadata = {} }) => {
  await ChatMessage.create({
    studentId,
    role,
    content,
    metadata
  });
};

const getChatHistory = async ({ studentId, limit = 20 }) => {
  const records = await ChatMessage.find({ studentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return records.reverse().map((record) => ({
    id: record._id.toString(),
    studentId: record.studentId,
    role: record.role,
    content: record.content,
    metadata: record.metadata || {},
    createdAt: record.createdAt
  }));
};

const saveTransaction = async (transaction) => {
  await PaymentTransaction.create(transaction);
};

const unlockPremiumContent = async ({ studentId, itemId, title }) => {
  await UnlockedContent.updateOne(
    { studentId, itemId },
    {
      $setOnInsert: {
        studentId,
        itemId,
        title,
        unlockedAt: new Date()
      }
    },
    { upsert: true }
  );
};

const hasUnlockedContent = async ({ studentId, itemId }) => {
  const unlocked = await UnlockedContent.exists({ studentId, itemId });
  return Boolean(unlocked);
};

const queueReceiptEmail = async ({ studentId, email, transactionId, itemTitle, amount }) => {
  await ReceiptQueueItem.create({
    studentId,
    email,
    transactionId,
    itemTitle,
    amount,
    queuedAt: new Date(),
    status: 'queued'
  });
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
