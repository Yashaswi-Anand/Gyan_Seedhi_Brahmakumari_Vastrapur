import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/common/Icon';
import InstallAppCard from '@/components/common/InstallAppCard';
import LanguageSwitch from '@/components/common/LanguageSwitch';
import Logo from '@/components/common/Logo';
import PointsSplit from '@/components/common/PointsSplit';
import PracticeCalendar from '@/components/home/PracticeCalendar';
import DatePdfCard from '@/components/teacher/DatePdfCard';
import TopThreeCard from '@/components/teacher/TopThreeCard';
import TreeBox from '@/components/tree/TreeBox';
import VardanWheel from '@/components/wheel/VardanWheel';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { wishAt } from '@/data/vardans';
import { downloadQuestionPaper } from '@/services/pdf';
import {
  chartPts,
  hasPlayedToday,
  leafCount,
  monthChart,
  monthMurli,
  monthPts,
  murliPts,
  streaks,
  todaysPlay,
} from '@/services/stats';
import { formatDateKey, formatLong, todayKey } from '@/utils/date';

export default function HomePage() {
  const { user, isTeacher } = useApp();
  const { t, tn, v, lang, cal } = useLang();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState({ busy: false, msg: '' });

  const played = hasPlayedToday(user);
  const st = streaks(user.plays);
  const leaves = leafCount(user);
  const spun = user.spins[todayKey()];
  const tp = todaysPlay(user);
  const { status: qStatus, date: qDate, questions, reload } = useQuestions();
  const count = questions.length;

  // pick up questions the teacher added or changed since the app opened
  useEffect(() => {
    reload();
  }, [reload]);

  const onPdf = async () => {
    if (pdf.busy || !count) return;
    setPdf({ busy: true, msg: 'PDF बन रही है…' });
    try {
      await downloadQuestionPaper(lang, questions, formatDateKey(qDate, cal));
      setPdf({ busy: false, msg: 'PDF डाउनलोड हो गई।' });
    } catch {
      setPdf({ busy: false, msg: 'PDF तैयार नहीं हो पाई। फिर से कोशिश करें।' });
    }
  };

  return (
    <>
      <div className="top">
        <div className="brand">
          <Logo size={34} />
          <span>{t('ज्ञान सीढ़ी')}</span>
        </div>
        <LanguageSwitch />
      </div>

      <InstallAppCard />

      <div className="hello">
        <div className="hrow">
          <p className="muted small">{formatLong(new Date(), cal)}</p>
          <span className="streak">
            <Icon name="flame" size={18} />
            {t(`${st.cur} दिन`)}
          </span>
        </div>
        <h2>
          {t('ओम शान्ति, ')}
          {tn(user.name)}
        </h2>
      </div>

      <div className="hero2">
        <div>
          <p className="eyebrow">
            {t('आज की मुरली')}
            {qDate ? ` · ${formatDateKey(qDate, cal)}` : ''}
          </p>
          <h2 className="hbig">
            {played ? (
              t('आज का अभ्यास पूरा')
            ) : qStatus === 'loading' ? (
              t('प्रश्न लोड हो रहे हैं…')
            ) : !count ? (
              t('आज के प्रश्न अभी उपलब्ध नहीं हैं')
            ) : (
              <>
                {/* dictionary key is " प्रश्न<br>" (from the original HTML), so translate with it and drop the tag */}
                {t(`${count} प्रश्न<br>`).replace('<br>', '')}
                <br />
                {t(`${count} मिनट`)}
              </>
            )}
          </h2>
          <p className="hsub">
            {played ? (
              <>
                {t(`आज के अंक ${tp.points} / ${(tp.mMax ?? 100) + (tp.cMax ?? 100)}`)}
                <br />
                {t(`मुरली ${murliPts(tp)} · चार्ट ${chartPts(tp)}`)}
              </>
            ) : count ? (
              t('हर प्रश्न के लिए 1 मिनट')
            ) : null}
          </p>
        </div>
        <TreeBox leaves={leaves} />
        <button className="btn white" onClick={() => navigate('/quiz')} disabled={!count}>
          {t(played ? 'फिर से अभ्यास (अंक नहीं जुड़ेंगे)' : 'अभ्यास शुरू करें')}
        </button>
      </div>

      {isTeacher ? (
        // teacher: this week's top 3 students, then any date's question paper
        <>
          <TopThreeCard />
          <DatePdfCard />
        </>
      ) : (
        <button className="dlrow" onClick={onPdf} disabled={pdf.busy || !count}>
          <span className="dlic">
            <Icon name="download" size={24} />
          </span>
          <span>
            <b>{t('आज के प्रश्न PDF में डाउनलोड करें')}</b>
            <small>{t(pdf.msg || 'बिना उत्तर के, सभी प्रश्न और विकल्प')}</small>
          </span>
        </button>
      )}

      {!played ? (
        <div className="wrow off">
          <div className="wmini">
            <VardanWheel mini />
          </div>
          <div>
            <b>{t('वरदान चक्र')}</b>
            <p className="small muted">{t('आज का अभ्यास पूरा करने पर खुलेगा')}</p>
          </div>
          <span className="lk">
            <Icon name="lock" size={22} />
          </span>
        </div>
      ) : spun == null ? (
        <button className="wrow on" onClick={() => navigate('/wheel')}>
          <div className="wmini">
            <VardanWheel mini />
          </div>
          <div>
            <b>{t('वरदान चक्र तैयार है')}</b>
            <p className="small">{t('घुमाने के लिए छुएँ')}</p>
          </div>
        </button>
      ) : (
        <button className="wrow" onClick={() => navigate('/wheel')}>
          <div className="wmini">
            <VardanWheel mini />
          </div>
          <div>
            <b>
              {t('आज का वरदान: ')}
              {v(wishAt(spun).w)}
            </b>
            <p className="small muted clamp2">{v(wishAt(spun).t)}</p>
          </div>
        </button>
      )}

      {/* this month's points (zero again on the 1st) and the practice calendar are for students only */}
      {!isTeacher && (
        <div className="ptcard">
          <div className="pth">
            <span className="muted">{t('इस महीने के अंक')}</span>
            <b>{monthPts(user)}</b>
          </div>
          <PointsSplit murli={monthMurli(user)} chart={monthChart(user)} />
        </div>
      )}

      {/* today's accuracy and longest streak are personal stats: students only */}
      {!isTeacher && (
        <div className="tiles two">
          <div className="tile">
            <b>{tp ? `${tp.acc}%` : '—'}</b>
            <span>{t('आज की सटीकता')}</span>
          </div>
          <div className="tile">
            <b>{st.best}</b>
            <span>{t('सबसे लम्बी लड़ी')}</span>
          </div>
        </div>
      )}

      {!isTeacher && <PracticeCalendar user={user} />}
    </>
  );
}
