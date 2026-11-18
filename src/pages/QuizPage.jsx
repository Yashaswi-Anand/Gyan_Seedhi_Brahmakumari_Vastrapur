import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AnswerFeedback from '@/components/quiz/AnswerFeedback';
import Lifelines from '@/components/quiz/Lifelines';
import MatchBoard from '@/components/quiz/MatchBoard';
import OptionList from '@/components/quiz/OptionList';
import ProgressLadder from '@/components/quiz/ProgressLadder';
import QuestionCard from '@/components/quiz/QuestionCard';
import QuitSheet from '@/components/quiz/QuitSheet';
import QuizHeader from '@/components/quiz/QuizHeader';
import SelfScoreInput from '@/components/quiz/SelfScoreInput';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import { buildResult } from '@/services/scoring';
import { hasPlayedToday } from '@/services/stats';

/** Waits for today's questions, then runs the quiz. */
export default function QuizPage() {
  const { user } = useApp();
  const { status, questions, date } = useQuestions();
  const { t, tq } = useLang();

  if (status === 'loading') return <p className="note" style={{ margin: 16 }}>{t('प्रश्न लोड हो रहे हैं…')}</p>;
  if (!questions.length) return <Navigate to="/" replace />;
  return <Quiz key={date} questions={questions} practice={hasPlayedToday(user)} />;
}

function Quiz({ questions, practice }) {
  const { user, addPlay, setLastQuiz } = useApp();
  const { t, tq } = useLang();
  const navigate = useNavigate();
  // Fixed for the whole attempt, even after today's play gets saved or questions change.
  const [setup] = useState(() => ({ qs: questions, practice }));
  const { game, q, quit, question, timeLeft, isLast, actions } = useQuizEngine(setup.qs, setup.practice);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [game.i]);

  const isMatch = question.type === 'match';
  const isSelf = question.type === 'self';
  const canLifeline = !q.done && !isMatch && !isSelf;

  const finish = () => {
    const { play, summary } = buildResult(user, game.qs, game.res, game.practice);
    if (play) addPlay(play);
    setLastQuiz({ qs: game.qs, res: game.res, summary });
    navigate('/result', { replace: true });
  };

  // chart question: saving the marks goes straight to the next question (or the result)
  const advance = useRef(false);
  const submitSelf = () => {
    if (q.done || q.sv == null) return;
    advance.current = true;
    actions.lock();
  };
  useEffect(() => {
    if (!advance.current || !q.done) return;
    advance.current = false;
    if (isLast) finish();
    else actions.next();
  }, [q.done]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <QuizHeader index={game.i} total={game.qs.length} timeLeft={timeLeft} onClose={actions.quitAsk} />
      <ProgressLadder
        total={game.qs.length}
        index={game.i}
        gapAt={game.qs.findIndex((x) => x.type === 'self')}
      />

      {game.practice && (
        <p className="note" style={{ margin: '10px 16px 0' }}>
          {t('अभ्यास: इस बार अंक नहीं जुड़ेंगे।')}
        </p>
      )}

      <Lifelines
        canFifty={game.fifty && canLifeline && question.opts.length > 2}
        canHint={game.hint && canLifeline && !!question.hint}
        onFifty={actions.fifty}
        onHint={actions.hint}
      />

      {/* keyed by question: each new question slides in */}
      <div key={game.i} className="qslide">
      <QuestionCard question={question} />

      {q.hint && (
        <div className="hintbox">
          <b>{t('संकेत:')}</b> {tq(question.hint)}
        </div>
      )}

      {isMatch ? (
        <MatchBoard question={question} state={q} onLeft={actions.matchLeft} onRight={actions.matchRight} />
      ) : isSelf ? (
        <SelfScoreInput state={q} onChange={actions.selfInput} onSubmit={submitSelf} />
      ) : (
        <OptionList question={question} state={q} onPick={actions.pick} />
      )}

      {q.msg && !q.done && <div className="msg">{t(q.msg)}</div>}

      {!q.done && !isMatch && !isSelf && (
        <div className="lockrow">
          <button className="btn" onClick={actions.lock} disabled={q.sel == null}>
            {t('उत्तर पक्का करें')}
          </button>
        </div>
      )}

      {/* chart: no lock step; the next button saves the marks and moves on */}
      {!q.done && isSelf && (
        <div className="lockrow">
          <button className="btn" onClick={submitSelf} disabled={q.sv == null}>
            {t(isLast ? 'परिणाम देखें' : 'अगला प्रश्न')}
          </button>
        </div>
      )}

      {q.done && (
        <>
          <AnswerFeedback question={question} result={game.res[game.i]} />
          <div className="lockrow">
            <button className="btn" onClick={isLast ? finish : actions.next}>
              {t(isLast ? 'परिणाम देखें' : 'अगला प्रश्न')}
            </button>
          </div>
        </>
      )}
      </div>

      {quit &&<QuitSheet onStay={actions.quitNo} onQuit={() => navigate('/', { replace: true })} />}
    </>
  );
}
