import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'vision-board-goals';

const defaultGoals = [
  { id: 'g1', text: 'Complete 3 Kuppi sessions this week', category: 'study', done: false },
  { id: 'g2', text: 'Revise core formulas for upcoming quiz', category: 'exam', done: true },
  { id: 'g3', text: 'Ask 2 questions during live sessions', category: 'confidence', done: false },
];

const moodCards = [
  { title: 'Consistency', text: 'Small daily steps beat last-minute effort.', color: '#dbeafe' },
  { title: 'Focus', text: 'Remove one distraction before each study block.', color: '#dcfce7' },
  { title: 'Courage', text: 'Growth happens when you ask even basic questions.', color: '#fef3c7' },
  { title: 'Momentum', text: 'Protect streaks, and your confidence compounds.', color: '#fee2e2' },
];

export default function VisionBoard() {
  const [goals, setGoals] = useState(defaultGoals);
  const [input, setInput] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setGoals(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  const progress = useMemo(() => {
    if (goals.length === 0) return 0;
    const doneCount = goals.filter(goal => goal.done).length;
    return Math.round((doneCount / goals.length) * 100);
  }, [goals]);

  const addGoal = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setGoals(prev => [{ id: Date.now().toString(), text, category: 'custom', done: false }, ...prev]);
    setInput('');
  };

  const toggleGoal = (id) => {
    setGoals(prev => prev.map(goal => (goal.id === id ? { ...goal, done: !goal.done } : goal)));
  };

  const removeGoal = (id) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">Vision Board</h1>
        <p className="page-subtitle">Turn goals into action with a focused weekly plan.</p>
      </div>

      <div className="grid" style={{ gap: 20, gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        <section className="card card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, color: 'var(--text-primary)' }}>Weekly Goals</h2>
            <span className="badge badge-blue">{progress}% complete</span>
          </div>

          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999, marginBottom: 20, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <form onSubmit={addGoal} style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="form-input"
              placeholder="Add a new goal for this week"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="submit" className="btn btn-primary">Add Goal</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goals.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <div className="empty-icon">🧭</div>
                <h3>No goals yet</h3>
                <p>Start by adding one focused goal for the week.</p>
              </div>
            )}

            {goals.map(goal => (
              <div key={goal.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                  <input type="checkbox" checked={goal.done} onChange={() => toggleGoal(goal.id)} />
                  <span style={{ textDecoration: goal.done ? 'line-through' : 'none', color: goal.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {goal.text}
                  </span>
                </label>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeGoal(goal.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card card-body">
            <h3 style={{ marginBottom: 10, color: 'var(--text-primary)' }}>North Star</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              I am building a strong, consistent learning routine that helps me grow in knowledge, confidence, and collaboration.
            </p>
          </section>

          <section className="card card-body">
            <h3 style={{ marginBottom: 10, color: 'var(--text-primary)' }}>Inspiration</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moodCards.map(card => (
                <div key={card.title} style={{ background: card.color, borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: '#334155' }}>{card.text}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}