import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';
import { togglePick, usePicks } from '@/services/picks';
import { formatDateKey } from '@/utils/date';
import { QuestionPreview } from './ProposalCard';

/**
 * Questions the AI offers (one format), each with a checkbox. A ticked question goes to the
 * Draft tab; unticking takes it out again.
 */
export default function OfferCard({ id, offer }) {
  const { t, cal } = useLang();
  const picks = usePicks();
  const picked = new Set(picks.map((p) => p.key));
  const shown = offer.items.filter((it) => it.question).length;

  return (
    <div className="proposal offer">
      <div className="pv-head">
        <b>
          {t('मुरली प्रश्न')} · {t(offer.format)}
        </b>
        {offer.murliDate && (
          <span className="pv-note">
            {t('मुरली')}: {formatDateKey(offer.murliDate, cal)}
          </span>
        )}
        {offer.note && <span className="pv-note">{offer.note}</span>}
      </div>

      {!shown && <p className="pv-invalid">{t('AI का प्रस्ताव अधूरा था; उसे ठीक करने को कहा गया है।')}</p>}

      {offer.items.map((it, i) => {
        if (!it.question) return null;
        const key = `${id}:${i}`;
        const on = picked.has(key);
        return (
          <label key={key} className={`offer-row${on ? ' on' : ''}`}>
            <input type="checkbox" checked={on} onChange={() => togglePick(key, it.question, offer.murliDate)} />
            <span className="offer-box" aria-hidden="true">
              {on && <Icon name="check" size={16} />}
            </span>
            <QuestionPreview q={it.question} showDate={false} />
          </label>
        );
      })}
    </div>
  );
}
