import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import { createQuiz, getQuizById, updateQuiz } from '../../services/quizService';
import './QuizBuilder.css';

const EMPTY_QUESTION = {
  questionText: '',
  questionType: 'MCQ',
  options: ['', '', '', ''],
  correctAnswer: '0',
  marks: 1,
  explanation: ''
};

const QuizBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // present when editing
  const isEdit = Boolean(id);
  const draftConfig = location.state?.draftConfig;
  const isDraftInitialized = Boolean(draftConfig) && !isEdit;

  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    difficulty: 'Medium',
    assessmentType: 'Quiz',
    timeLimit: 30,
    isPremium: false,
    premiumPrice: 0,
    premiumCurrency: 'USD'
  });
  const [questions, setQuestions] = useState([{ ...EMPTY_QUESTION, options: ['', '', '', ''] }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  // Load quiz data when editing
  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const res = await getQuizById(id);
        const quiz = res.data;
        setForm({
          title: quiz.title,
          subject: quiz.subject,
          description: quiz.description || '',
          difficulty: quiz.difficulty,
          assessmentType: quiz.assessmentType || 'Quiz',
          timeLimit: quiz.timeLimit,
          isPremium: Boolean(quiz.isPremium),
          premiumPrice: Number(quiz.premiumPrice || 0),
          premiumCurrency: quiz.premiumCurrency || 'USD'
        });
        setQuestions(quiz.questions.map(q => ({
          ...q,
          options: q.options?.length ? q.options : ['', '', '', '']
        })));
      } catch { setError('Failed to load quiz.'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit || !draftConfig) return;

    setForm((prev) => ({
      ...prev,
      title: draftConfig.title || prev.title,
      subject: draftConfig.subject || prev.subject,
      description: draftConfig.description || prev.description,
      difficulty: draftConfig.difficulty || prev.difficulty,
      assessmentType: draftConfig.assessmentType || prev.assessmentType,
      timeLimit: Number(draftConfig.timeLimit || prev.timeLimit),
      isPremium: Boolean(draftConfig.isPremium),
      premiumPrice: Number(draftConfig.premiumPrice || 0),
      premiumCurrency: draftConfig.premiumCurrency || prev.premiumCurrency
    }));
  }, [draftConfig, isEdit]);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => {
      if (name === 'isPremium') {
        return {
          ...prev,
          isPremium: checked,
          premiumPrice: checked ? prev.premiumPrice || 1 : 0
        };
      }

      if (name === 'timeLimit' || name === 'premiumPrice') {
        return { ...prev, [name]: Number(value) };
      }

      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== idx) return q;
      const updated = { ...q, [field]: value };
      // Reset correctAnswer when type changes
      if (field === 'questionType') {
        updated.options = value === 'MCQ' ? ['', '', '', ''] : [];
        updated.correctAnswer = value === 'TrueFalse' ? 'True' : '';
      }
      return updated;
    }));
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { ...EMPTY_QUESTION, options: ['', '', '', ''] }]);
    // Scroll to bottom after add
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
  };

  const removeQuestion = idx => {
    if (questions.length === 1) { alert('Quiz must have at least one question.'); return; }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx, dir) => {
    const newQ = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= newQ.length) return;
    [newQ[idx], newQ[target]] = [newQ[target], newQ[idx]];
    setQuestions(newQ);
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.title.trim()) return 'Quiz title is required.';
    if (!form.subject.trim()) return 'Subject is required.';
    if (form.timeLimit < 1) return 'Time limit must be at least 1 minute.';
    if (form.isPremium && Number(form.premiumPrice) <= 0) return 'Premium price must be greater than 0.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return `Question ${i + 1}: text is required.`;
      if (q.questionType === 'MCQ') {
        if (q.options.some(o => !o.trim())) return `Question ${i + 1}: all options must be filled.`;
        if (!['0', '1', '2', '3'].includes(String(q.correctAnswer))) return `Question ${i + 1}: select the correct answer.`;
      }
      if (q.questionType === 'TrueFalse' && !['True', 'False'].includes(q.correctAnswer)) {
        return `Question ${i + 1}: select True or False.`;
      }
      if (q.questionType === 'ShortAnswer' && !q.correctAnswer.trim()) {
        return `Question ${i + 1}: provide the correct answer.`;
      }
    }
    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, questions };
      if (isEdit) {
        await updateQuiz(id, payload);
      } else {
        await createQuiz(payload);
      }
      navigate('/quizzes');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save quiz.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="builder-loading"><div className="spinner"></div><p>Loading quiz...</p></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="quiz-builder-page">
        <div className="builder-header">
          <button className="back-btn" onClick={() => navigate('/quizzes')}>← Back</button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Assessment' : 'Assessment Draft Studio'}</h1>
            <p className="page-subtitle">
              {isDraftInitialized
                ? 'Draft initialized from command center. Complete fields and publish.'
                : 'Design quiz or mock exam structure, then publish to inventory.'}
            </p>
            {form.isPremium && (
              <span className="premium-live-pill">
                PREMIUM {(form.premiumCurrency || 'USD').toUpperCase()} {Number(form.premiumPrice || 0).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}
        {isDraftInitialized && (
          <div className="draft-notice">
            Draft initialized with quick settings. You can adjust premium price, assessment type, and questions before publish.
          </div>
        )}

        <form onSubmit={handleSubmit} className="builder-form">
          {/* Quiz Details Card */}
          <div className="builder-card">
            <h2 className="card-section-title">Assessment Configuration</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Quiz Title <span className="required">*</span></label>
                <input name="title" value={form.title} onChange={handleFormChange} placeholder="e.g. Data Structures Final Exam" className="form-input" />
              </div>
              <div className="form-group">
                <label>Subject <span className="required">*</span></label>
                <input name="subject" value={form.subject} onChange={handleFormChange} placeholder="e.g. Computer Science" className="form-input" />
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select name="difficulty" value={form.difficulty} onChange={handleFormChange} className="form-input">
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assessment Type</label>
                <select name="assessmentType" value={form.assessmentType} onChange={handleFormChange} className="form-input">
                  <option value="Quiz">Quiz</option>
                  <option value="MockExam">Mock Exam</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time Limit (minutes) <span className="required">*</span></label>
                <input type="number" name="timeLimit" value={form.timeLimit} onChange={handleFormChange} min="1" max="180" className="form-input" />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Brief description of this quiz..." className="form-input form-textarea" rows={3} />
              </div>

              <div className="form-group full-width">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    name="isPremium"
                    checked={form.isPremium}
                    onChange={handleFormChange}
                  />
                  Mark this quiz as premium
                </label>
              </div>

              {form.isPremium && (
                <div className="premium-config full-width">
                  <div className="premium-config-head">
                    <h3>Premium {form.assessmentType === 'MockExam' ? 'Mock Exam' : 'Quiz'} Configuration</h3>
                    <span>Payment Gateway: Stripe</span>
                  </div>

                  <div className="premium-config-grid">
                    <div className="form-group">
                      <label>Premium Price <span className="required">*</span></label>
                      <input
                        type="number"
                        name="premiumPrice"
                        value={form.premiumPrice}
                        onChange={handleFormChange}
                        min="1"
                        step="0.01"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Currency</label>
                      <select
                        name="premiumCurrency"
                        value={form.premiumCurrency}
                        onChange={handleFormChange}
                        className="form-input"
                      >
                        <option value="USD">USD</option>
                        <option value="LKR">LKR</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <p className="premium-note">
                    This premium {form.assessmentType === 'MockExam' ? 'mock exam' : 'quiz'} will be available through the Premium checkout flow after publishing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, qi) => (
            <div key={qi} className="builder-card question-card">
              <div className="question-header">
                <span className="question-number">Q{qi + 1}</span>
                <div className="question-actions">
                  <button type="button" className="q-action-btn" onClick={() => moveQuestion(qi, -1)} disabled={qi === 0} title="Move up">↑</button>
                  <button type="button" className="q-action-btn" onClick={() => moveQuestion(qi, 1)} disabled={qi === questions.length - 1} title="Move down">↓</button>
                  <button type="button" className="q-action-btn danger" onClick={() => removeQuestion(qi)} title="Remove">🗑</button>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Question Text <span className="required">*</span></label>
                  <textarea
                    value={q.questionText}
                    onChange={e => handleQuestionChange(qi, 'questionText', e.target.value)}
                    placeholder="Enter question..."
                    className="form-input form-textarea"
                    rows={2}
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select value={q.questionType} onChange={e => handleQuestionChange(qi, 'questionType', e.target.value)} className="form-input">
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TrueFalse">True / False</option>
                    <option value="ShortAnswer">Short Answer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Marks</label>
                  <input type="number" value={q.marks} min="1" max="100" onChange={e => handleQuestionChange(qi, 'marks', Number(e.target.value))} className="form-input" />
                </div>

                {/* MCQ Options */}
                {q.questionType === 'MCQ' && (
                  <div className="form-group full-width">
                    <label>Options & Correct Answer <span className="required">*</span></label>
                    <div className="options-grid">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`option-row ${q.correctAnswer === String(oi) ? 'correct' : ''}`}>
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correctAnswer === String(oi)}
                            onChange={() => handleQuestionChange(qi, 'correctAnswer', String(oi))}
                            className="radio-input"
                            title="Mark as correct"
                          />
                          <span className="option-label">{String.fromCharCode(65 + oi)}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => handleOptionChange(qi, oi, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className="form-input option-input"
                          />
                          {q.correctAnswer === String(oi) && <span className="correct-tag">✓ Correct</span>}
                        </div>
                      ))}
                    </div>
                    <p className="hint">Click the radio button to mark the correct answer</p>
                  </div>
                )}

                {/* True/False */}
                {q.questionType === 'TrueFalse' && (
                  <div className="form-group full-width">
                    <label>Correct Answer <span className="required">*</span></label>
                    <div className="tf-options">
                      {['True', 'False'].map(tf => (
                        <label key={tf} className={`tf-option ${q.correctAnswer === tf ? 'selected' : ''}`}>
                          <input type="radio" name={`tf-${qi}`} value={tf} checked={q.correctAnswer === tf} onChange={() => handleQuestionChange(qi, 'correctAnswer', tf)} />
                          {tf === 'True' ? '✅ True' : '❌ False'}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {q.questionType === 'ShortAnswer' && (
                  <div className="form-group full-width">
                    <label>Correct Answer <span className="required">*</span></label>
                    <input
                      type="text"
                      value={q.correctAnswer}
                      onChange={e => handleQuestionChange(qi, 'correctAnswer', e.target.value)}
                      placeholder="Expected answer (case-insensitive)"
                      className="form-input"
                    />
                  </div>
                )}

                <div className="form-group full-width">
                  <label>Explanation (optional)</label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={e => handleQuestionChange(qi, 'explanation', e.target.value)}
                    placeholder="Explain why this is the correct answer..."
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <button type="button" className="add-question-btn" onClick={addQuestion}>
            + Add Question
          </button>

          {/* Total marks summary */}
          <div className="marks-summary">
            <span>Total Questions: <strong>{questions.length}</strong></span>
            <span>Total Marks: <strong>{questions.reduce((s, q) => s + (Number(q.marks) || 0), 0)}</strong></span>
            <span>Time Limit: <strong>{form.timeLimit} min</strong></span>
          </div>

          {/* Submit */}
          <div className="builder-submit-row">
            <button type="button" className="btn-secondary-lg" onClick={() => navigate('/quizzes')}>Cancel</button>
            <button type="submit" className="btn-primary-lg" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Assessment' : 'Publish Assessment'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default QuizBuilder;
