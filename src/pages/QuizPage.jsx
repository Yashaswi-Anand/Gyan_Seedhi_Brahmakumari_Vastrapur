import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { buildQuestions } from '@/data/questions';
import { useQuizEngine } from '@/hooks/useQuizEngine';
import { buildResult } from '@/services/scoring';
import { hasPlayedToday } from '@/services/stats';

export default function QuizPage() {
  const { user, addPlay, setLastQuiz } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  // Fixed for the whole attempt, even after today's play gets saved.
  const [setup] = useState(() => ({ qs: buildQuestions(), practice: hasPlayedToday(user) }));
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

  return (
    <>
      <QuizHeader index={game.i} total={game.qs.length} timeLeft={timeLeft} onClose={actions.quitAsk} />
      <ProgressLadder total={game.qs.length} index={game.i} />

      {game.practice && (
        <p className="note" style={{ margin: '10px 16px 0' }}>
          {t('अभ्यास: इस बार अंक नहीं जुड़ेंगे।')}
        </p>
      )}

      <Lifelines
        canFifty={game.fifty && canLifeline && question.opts.length > 2}
        canHint={game.hint && canLifeline}
        onFifty={actions.fifty}
        onHint={actions.hint}
      />

      <QuestionCard question={question} />

      {q.hint && (
        <div className="hintbox">
          <b>{t('संकेत:')}</b> {t(question.hint)}
        </div>
      )}

      {isMatch ? (
        <MatchBoard question={question} state={q} onLeft={actions.matchLeft} onRight={actions.matchRight} />
      ) : isSelf ? (
        <SelfScoreInput state={q} onChange={actions.selfInput} onSubmit={actions.lock} />
      ) : (
        <OptionList question={question} state={q} onPick={actions.pick} />
      )}

      {q.msg && !q.done && <div className="msg">{t(q.msg)}</div>}

      {!q.done && !isMatch && (
        <div className="lockrow">
          <button className="btn" onClick={actions.lock} disabled={isSelf ? q.sv == null : q.sel == null}>
            {t('उत्तर पक्का करें')}
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

      {quit && <QuitSheet onStay={actions.quitNo} onQuit={() => navigate('/', { replace: true })} />}
    </>
  );
}
