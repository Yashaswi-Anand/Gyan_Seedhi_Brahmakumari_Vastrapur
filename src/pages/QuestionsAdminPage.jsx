import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Icon from '@/components/common/Icon';
import TopBar from '@/components/common/TopBar';
import DraftsBar from '@/components/teacher/DraftsBar';
import PicksDraft from '@/components/teacher/PicksDraft';
import QaChat from '@/components/teacher/QaChat';
import QuestionForm from '@/components/teacher/QuestionForm';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { OPTION_LETTERS } from '@/i18n/calendar';
import { registerQuestionTranslations } from '@/i18n/translate';
import { usePicks } from '@/services/picks';
import {
  addQuestion,
  deleteQuestion,
  sortQuestions,
  updateQuestion,
  watchAllQuestions,
} from '@/services/questionsRepo';
import { formatDateKey, parseDateKey, todayKey } from '@/utils/date';
import DateField from '@/components/common/DateField';
import { chartMarksOf } from '@/constants/config';

/** Group questions by date, newest date first. */
function byDate(list) {
  const map = new Map();
  list.forEach((q) => map.set(q.date, [...(map.get(q.date) || []), q]));
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, qs]) => ({ date, questions: sortQuestions(qs) }));
}

function QuestionItem({ q, n, onEdit, onDelete }) {
  const { t, lang, tq } = useLang();
  const letters = OPTION_LETTERS[lang];
  const murli = q.category === 'murli';
  return (
    <article className="qa-item">
      <div className="qa-top">
        <span className="qa-n">{n}</span>
        <span className={`chip cat${murli ? '' : ' ch'}`}>{t(murli ? 'मुरली' : 'चार्ट')}</span>
        {q.published === false && <span className="chip draft">{t('ड्राफ्ट')}</span>}
        {murli && q.tag && <span className="chip">{tq(q.tag)}</span>}
        {!murli && q.title && <span className="chip gold">{tq(q.title)}</span>}
        <span className="qa-langs" title={t('भाषा')}>
          {['hi', 'en', 'gu']
            .filter((l) => q.i18n?.[l])
            .map((l) => ({ hi: 'हि', en: 'En', gu: 'ગુ' })[l])
            .join(' · ') || '—'}
        </span>
      </div>
      <p className="qa-q">{tq(q.q)}</p>

      {murli ? (
        <ol className="qa-opts">
          {q.opts.map((o, i) => (
            <li key={i} className={i === q.ans ? 'right' : ''}>
              <span className="lt">{i === q.ans ? <Icon name="check" size={16} /> : letters[i]}</span>
              <span>{tq(o)}</span>
              {i === q.ans && <em>{t('सही उत्तर')}</em>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="qa-self">
          {t(chartMarksOf(q) === 10 ? 'स्व-मूल्यांकन: विद्यार्थी 0 से 10 अंक स्वयं देते हैं' : 'स्व-मूल्यांकन: विद्यार्थी 0 से 20 अंक स्वयं देते हैं')}
        </p>
      )}

      {murli && (q.hint || q.exp) && (
        <div className="qa-extra">
          {q.hint && (
            <p>
              <b>{t('संकेत:')}</b> {tq(q.hint)}
            </p>
          )}
          {q.exp && (
            <p>
              <b>{t('मुरली का बिंदु')}:</b> {tq(q.exp)}
            </p>
          )}
        </div>
      )}

      <div className="qa-actions">
        <button className="qa-btn" onClick={() => onEdit(q)}>
          <Icon name="edit" size={18} />
          {t('बदलें')}
        </button>
        <button className="qa-btn del" onClick={() => onDelete(q)}>
          <Icon name="trash" size={18} />
          {t('हटाएँ')}
        </button>
      </div>
    </article>
  );
}

/** Teacher only: Q/A chat with Gemini, plus every question date-wise with add / edit / delete. */
export default function QuestionsAdminPage() {
  const { t, cal, tq } = useLang();
  const { reload } = useQuestions();
  const [list, setList] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, question = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [view, setView] = useState('chat'); // 'chat' | 'list' | 'picks'
  const picks = usePicks(); // questions ticked in the chat → the Draft tab (shown only while there are some)
  const [day, setDay] = useState(todayKey); // date filter for the question list (default: today)
  const tab = view === 'picks' && !picks.length ? 'chat' : view; // the Draft tab hides once it's empty

  // ticked questions were published: show that date's questions
  const published = (date, n) => {
    setDay(date);
    setView('list');
    setToast(`${n} प्रश्न प्रकाशित हो गए।`);
  };

  useEffect(
    () =>
      watchAllQuestions(
        (qs) => {
          registerQuestionTranslations(qs);
          setList(qs);
          setLoadError(false);
        },
        () => setLoadError(true),
      ),
    [],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const groups = useMemo(() => byDate(list || []), [list]);
  const today = todayKey();
  const shown = groups.filter((g) => g.date === day);
  // nearest dates (before / after the chosen one) that have questions, for the ‹ › buttons
  const prevDate = groups.find((g) => g.date < day)?.date;
  const nextDate = [...groups].reverse().find((g) => g.date > day)?.date;
  // the first date after today that already has questions (e.g. tomorrow's), offered from today and earlier
  const upcoming = [...groups].reverse().find((g) => g.date > today)?.date;
  // chart questions are the same every day: a date without its own shows the ones students get that day
  const reusedChart = useMemo(() => {
    const own = shown[0]?.questions || [];
    if (own.some((q) => q.category === 'chart')) return null;
    const src = groups.find((g) => g.date < day && g.questions.some((q) => q.category === 'chart' && q.published !== false));
    return src ? { date: src.date, questions: src.questions.filter((q) => q.category === 'chart' && q.published !== false) } : null;
  }, [groups, shown, day]);

  const save = async (form) => {
    if (editing?.id) await updateQuestion(editing.id, form, editing);
    else await addQuestion(form);
    setEditing(null);
    setToast(editing?.id ? 'प्रश्न बदल दिया गया।' : 'प्रश्न जोड़ दिया गया।');
    reload(); // refresh today's quiz set too
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteQuestion(deleting.id);
      setDeleting(null);
      setToast('प्रश्न हटा दिया गया।');
      reload();
    } catch {
      setToast('हटाया नहीं जा सका। फिर से कोशिश करें।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="AI" />
      <div className="pad qa-switch">
        <div className={`seg ${picks.length ? 'three' : 'two'}`} role="tablist">
          {[
            ['chat', 'चैट', 'chat'],
            ...(picks.length ? [['picks', 'ड्राफ्ट', 'edit']] : []),
            ['list', 'प्रश्न सूची', 'list'],
          ].map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setView(id)}>
              <Icon name={icon} size={18} /> {t(label)}
              {id === 'picks' && <span className="tab-count">{picks.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="pad qa-drafts">
        <DraftsBar questions={list || []} />
      </div>

      {tab === 'chat' ? (
        <QaChat questions={list || []} />
      ) : tab === 'picks' ? (
        <PicksDraft questions={list || []} onPublished={published} />
      ) : (
      <div className="pad stack qa-page">
        <button className="btn" onClick={() => setEditing({})}>
          <Icon name="plus" size={22} />
          {t('नया प्रश्न जोड़ें')}
        </button>

        {loadError && <p className="msg">{t('प्रश्न लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
        {!list && !loadError && <p className="note">{t('प्रश्न लोड हो रहे हैं…')}</p>}
        {list && !list.length && <p className="note">{t('अभी कोई प्रश्न नहीं है। ऊपर से नया प्रश्न जोड़ें।')}</p>}

        {list && list.length > 0 && (
          <div className="qa-filter">
            <button
              className="qa-nav"
              onClick={() => setDay(prevDate)}
              disabled={!prevDate}
              aria-label={t('पिछली तारीख')}
              title={t('पिछली तारीख')}
            >
              <Icon name="back" size={20} />
            </button>
            <DateField
              value={day}
              aria-label={t('तारीख')}
              onChange={(e) => e.target.value && setDay(e.target.value)}
            />
            <button
              className="qa-nav next"
              onClick={() => setDay(nextDate)}
              disabled={!nextDate}
              aria-label={t('अगली तारीख')}
              title={t('अगली तारीख')}
            >
              <Icon name="back" size={20} />
            </button>
            {day !== today && (
              <button className="link qa-today-btn" onClick={() => setDay(today)}>
                {t('आज पर जाएँ')}
              </button>
            )}
          </div>
        )}

        {upcoming && day <= today && (
          <button className="qa-upcoming" onClick={() => setDay(upcoming)}>
            <span>
              {cal.days[parseDateKey(upcoming).getDay()]}, {formatDateKey(upcoming, cal)}
              <small>{t('के प्रश्न भी तैयार हैं — देखने के लिए छुएँ')}</small>
            </span>
            <Icon name="back" size={20} />
          </button>
        )}

        {list && list.length > 0 && !shown.length && (
          <p className="note">
            {formatDateKey(day, cal)} — {t('इस तारीख के लिए कोई प्रश्न नहीं है।')}
          </p>
        )}

        {shown.map((g) => {
          const d = parseDateKey(g.date);
          const murliN = g.questions.filter((q) => q.category === 'murli').length;
          const chartN = g.questions.length - murliN + (reusedChart?.questions.length || 0);
          return (
            <section key={g.date} className="qa-day">
              <h3 className="monthhead">
                <span>
                  {cal.days[d.getDay()]}, {formatDateKey(g.date, cal)}
                  {g.date === today && <span className="chip today qa-today">{t('आज')}</span>}
                </span>
                <small>
                  {t('मुरली')} {murliN} · {t('चार्ट')} {chartN}
                </small>
              </h3>
              <div className="stack" style={{ gap: 12 }}>
                {g.questions.map((q, i) => (
                  <QuestionItem key={q.id} q={q} n={i + 1} onEdit={setEditing} onDelete={setDeleting} />
                ))}
                {reusedChart && (
                  <>
                    <p className="note qa-reused">
                      {t('चार्ट प्रश्न हर दिन वही रहते हैं। ये प्रश्न इस तारीख से लिए गए हैं:')} {formatDateKey(reusedChart.date, cal)}
                    </p>
                    {reusedChart.questions.map((q, i) => (
                      <QuestionItem key={q.id} q={q} n={g.questions.length + i + 1} onEdit={setEditing} onDelete={setDeleting} />
                    ))}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      )}

      {editing && <QuestionForm initial={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="प्रश्न हटाएँ?"
          message={`${formatDateKey(deleting.date, cal)} · ${tq(deleting.q).slice(0, 120)}`}
          confirmLabel="हाँ, हटाएँ"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {t(toast)}
        </div>
      )}
    </>
  );
}
