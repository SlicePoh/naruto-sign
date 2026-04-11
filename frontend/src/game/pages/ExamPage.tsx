import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameNav } from '../GameNav';
import { useGameStore } from '../useGameStore';
import { RANK_LABELS, PROMOTION_EXAMS, RANK_ORDER } from '../types';

export function ExamPage() {
  const profile = useGameStore((s) => s.profile);
  const canTakeExam = useGameStore((s) => s.canTakeExam);
  const promote = useGameStore((s) => s.promote);
  const recordExamAttempt = useGameStore((s) => s.recordExamAttempt);
  const addXP = useGameStore((s) => s.addXP);
  const navigate = useNavigate();

  const [examState, setExamState] = useState<'ready' | 'in-progress' | 'passed' | 'failed'>('ready');
  const [taskResults, setTaskResults] = useState<boolean[]>([]);

  if (!profile) return null;

  const exam = PROMOTION_EXAMS.find((e) => e.fromRank === profile.rank);

  if (!exam) {
    return (
      <div className="game-page">
        <GameNav />
        <div className="exam-header">
          <div className="exam-title">MAX RANK ACHIEVED</div>
          <div className="exam-rank-badge">
            You have reached {RANK_LABELS[profile.rank]} — the highest rank.
          </div>
        </div>
      </div>
    );
  }

  const eligible = canTakeExam();

  // Cooldown info
  let cooldownMessage = '';
  if (profile.lastExamAttempt && profile.lastExamResult === 'fail') {
    const cooldownMs = exam.cooldownHours * 60 * 60 * 1000;
    const elapsed = Date.now() - profile.lastExamAttempt;
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
      cooldownMessage = `Cooldown: ${remaining}h remaining before you can retry.`;
    }
  }

  const handleStartExam = () => {
    setExamState('in-progress');
    setTaskResults([]);
  };

  // Simulate exam — in a real version this would wire into the camera/sign tracker
  const handleSimulatePass = () => {
    const results = exam.tasks.map(() => true);
    setTaskResults(results);
    setExamState('passed');
    recordExamAttempt('pass');
    promote(exam.toRank);
    addXP(100); // bonus XP for promotion
  };

  const handleSimulateFail = () => {
    const results = exam.tasks.map((_, i) => i < exam.tasks.length - 1);
    setTaskResults(results);
    setExamState('failed');
    recordExamAttempt('fail');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="game-page">
      <GameNav />

      <div className="exam-header">
        <div className="exam-title">{exam.title}</div>
        <div className="exam-rank-badge">
          {RANK_LABELS[exam.fromRank]} → {RANK_LABELS[exam.toRank]}
        </div>
      </div>

      <div className="exam-tasks">
        {/* Requirements check */}
        {examState === 'ready' && (
          <>
            <div className="g-card" style={{ marginBottom: 20 }}>
              <div className="g-card-title">REQUIREMENTS</div>
              <div className="stat-row">
                <span className="stat-label">Required XP</span>
                <span className={profile.xp >= exam.requiredXP ? 'stat-value' : 'stat-value--accent'}>
                  {profile.xp} / {exam.requiredXP}
                  {profile.xp >= exam.requiredXP ? ' ✓' : ''}
                </span>
              </div>
              {Object.entries(exam.requiredJutsuMastery).map(([jutsuId, reqMastery]) => {
                const jp = profile.jutsuProgress.find((j) => j.jutsuId === jutsuId);
                const current = jp?.mastery ?? 0;
                const met = current >= (reqMastery ?? 0);
                return (
                  <div key={jutsuId} className="stat-row">
                    <span className="stat-label">{jutsuId} mastery</span>
                    <span className={met ? 'stat-value' : 'stat-value--accent'}>
                      {current}% / {reqMastery}%{met ? ' ✓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {cooldownMessage && (
              <div className="g-card g-card--accent">
                <div className="g-card-title g-card-title--accent">COOLDOWN</div>
                <p className="select-card-desc">{cooldownMessage}</p>
              </div>
            )}

            <div className="g-card">
              <div className="g-card-title">EXAM TASKS</div>
              {exam.tasks.map((task, i) => (
                <div key={i} className="exam-task">
                  <span className="exam-task-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="exam-task-desc">{task.description}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* In progress */}
        {examState === 'in-progress' && (
          <div className="g-card">
            <div className="g-card-title">EXAM IN PROGRESS</div>
            {exam.tasks.map((task, i) => (
              <div key={i} className="exam-task">
                <span className="exam-task-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="exam-task-desc">{task.description}</span>
                <span className="exam-task-status">...</span>
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button className="g-btn" onClick={handleSimulatePass}>
                SIMULATE PASS
              </button>
              <button className="g-btn g-btn--danger" onClick={handleSimulateFail}>
                SIMULATE FAIL
              </button>
            </div>
          </div>
        )}

        {/* Result: passed */}
        {examState === 'passed' && (
          <div className="g-card">
            <div className="g-card-title" style={{ color: 'var(--hud-success)' }}>
              PROMOTION GRANTED
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', marginBottom: 12 }}>
              Congratulations! You have been promoted to <strong>{RANK_LABELS[exam.toRank]}</strong>.
            </p>
            {exam.tasks.map((task, i) => (
              <div key={i} className="exam-task">
                <span className="exam-task-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="exam-task-desc">{task.description}</span>
                <span className="exam-task-status" style={{ color: 'var(--hud-success)' }}>PASS</span>
              </div>
            ))}
          </div>
        )}

        {/* Result: failed */}
        {examState === 'failed' && (
          <div className="g-card">
            <div className="g-card-title" style={{ color: 'var(--hud-danger)' }}>
              EXAM FAILED
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', marginBottom: 12 }}>
              You did not pass. Keep training and try again after the cooldown period.
            </p>
            {exam.tasks.map((task, i) => (
              <div key={i} className="exam-task">
                <span className="exam-task-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="exam-task-desc">{task.description}</span>
                <span
                  className="exam-task-status"
                  style={{ color: taskResults[i] ? 'var(--hud-success)' : 'var(--hud-danger)' }}
                >
                  {taskResults[i] ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="exam-actions">
        {examState === 'ready' && (
          <button
            className="g-btn g-btn--accent g-btn--large"
            disabled={!eligible}
            onClick={handleStartExam}
          >
            {eligible ? 'BEGIN EXAM' : 'NOT ELIGIBLE'}
          </button>
        )}
        {(examState === 'passed' || examState === 'failed') && (
          <button className="g-btn g-btn--large" onClick={handleBackToDashboard}>
            RETURN TO DASHBOARD
          </button>
        )}
      </div>
    </div>
  );
}
