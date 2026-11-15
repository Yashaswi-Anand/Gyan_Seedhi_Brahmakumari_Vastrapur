import { useLang } from '@/context/LanguageContext';

/** Bottom-sheet confirmation (used instead of window.confirm so it matches the app and works on phones). */
export default function ConfirmDialog({ title, message, confirmLabel, busy = false, onConfirm, onCancel }) {
  const { t } = useLang();
  return (
    <div className="sheet" role="alertdialog" aria-modal="true" aria-label={t(title)}>
      <div>
        <h3 style={{ fontSize: 22 }}>{t(title)}</h3>
        {message && <p className="muted">{message}</p>}
        <button className="btn danger" onClick={onConfirm} disabled={busy}>
          {t(confirmLabel)}
        </button>
        <button className="btn line" onClick={onCancel} disabled={busy}>
          {t('रद्द करें')}
        </button>
      </div>
    </div>
  );
}
