import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Icon from '@/components/common/Icon';
import TopBar from '@/components/common/TopBar';
import QuestionForm from '@/components/teacher/QuestionForm';
import { useLang } from '@/context/LanguageContext';
import { useQuestions } from '@/context/QuestionsContext';
import { OPTION_LETTERS } from '@/i18n/calendar';
import {
  addQuestion,
  deleteQuestion,
  sortQuestions,
  updateQuestion,
  watchAllQuestions,
} from '@/services/questionsRepo';
import { formatDateKey, parseDateKey, todayKey } from '@/utils/date';

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
        {murli && q.tag && <span className="chip">{tq(q.tag)}</span>}
        {!murli && q.title && <span className="chip gold">{tq(q.title)}</span>}
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
        <p className="qa-self">{t('स्व-मूल्यांकन: विद्यार्थी 0 से 20 अंक स्वयं देते हैं')}</p>
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

/** Teacher only: every question, date-wise, with add / edit / delete. */
export default function QuestionsAdminPage() {
  const { t, cal, tq } = useLang();
  const { reload } = useQuestions();
  const [list, setList] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, question = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(
    () =>
      watchAllQuestions(
        (qs) => {
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
      <TopBar title="प्रश्न/उत्तर" />
      <div className="pad stack qa-page">
        <button className="btn" onClick={() => setEditing({})}>
          <Icon name="plus" size={22} />
          {t('नया प्रश्न जोड़ें')}
        </button>

        {loadError && <p className="msg">{t('प्रश्न लोड नहीं हो पाए। इंटरनेट जाँचें।')}</p>}
        {!list && !loadError && <p className="note">{t('प्रश्न लोड हो रहे हैं…')}</p>}
        {list && !list.length && <p className="note">{t('अभी कोई प्रश्न नहीं है। ऊपर से नया प्रश्न जोड़ें।')}</p>}

        {groups.map((g) => {
          const d = parseDateKey(g.date);
          const murliN = g.questions.filter((q) => q.category === 'murli').length;
          return (
            <section key={g.date} className="qa-day">
              <h3 className="monthhead">
                <span>
                  {cal.days[d.getDay()]}, {formatDateKey(g.date, cal)}
                  {g.date === today && <span className="chip today qa-today">{t('आज')}</span>}
                </span>
                <small>
                  {t('मुरली')} {murliN} · {t('चार्ट')} {g.questions.length - murliN}
                </small>
              </h3>
              <div className="stack" style={{ gap: 12 }}>
                {g.questions.map((q, i) => (
                  <QuestionItem key={q.id} q={q} n={i + 1} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

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
