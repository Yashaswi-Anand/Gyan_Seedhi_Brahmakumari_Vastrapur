import { useLang } from '@/context/LanguageContext';

/** Murli points / Chart points side by side, with optional maxima. */
export default function PointsSplit({ murli, chart, murliMax, chartMax }) {
  const { t } = useLang();
  return (
    <div className="ptsplit">
      <div className="pm">
        <span>{t('मुरली अंक')}</span>
        <b>{murli}</b>
        {murliMax ? <small> / {murliMax}</small> : null}
      </div>
      <div className="pc">
        <span>{t('चार्ट अंक')}</span>
        <b>{chart}</b>
        {chartMax ? <small> / {chartMax}</small> : null}
      </div>
    </div>
  );
}
