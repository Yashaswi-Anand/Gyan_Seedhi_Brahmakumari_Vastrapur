import Icon from '@/components/common/Icon';
import { useLang } from '@/context/LanguageContext';

const usd = (n) => `$${(n || 0).toFixed(n >= 10 ? 0 : 2)}`;

/**
 * Shows the teacher's weekly AI limit (USD) – display only.
 * Usage is still tracked on the server: the AI tab warns at 80% and the AI stops at 100%.
 */
export default function WeeklyLimitCard({ status }) {
  const { t } = useLang();
  const b = status.budget;

  return (
    <section className="set-card stack">
      <h3>
        <Icon name="trophy" size={18} /> {t('साप्ताहिक AI सीमा')}
      </h3>
      <div className="use-box">
        <div className="use-nums">
          <b>{b?.limitUsd ? usd(b.limitUsd) : '—'}</b>
          <span>{t(b?.limitUsd ? 'प्रति सप्ताह' : '(कोई सीमा नहीं)')}</span>
        </div>
      </div>
    </section>
  );
}
