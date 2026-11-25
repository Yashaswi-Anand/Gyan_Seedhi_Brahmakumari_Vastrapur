import { maxMarks } from '@/constants/config';
import { useLang } from '@/context/LanguageContext';

/** Chart question: the person enters their own marks from 0 to the question's marks (see CHART_MARKS). Enter submits. */
export default function SelfScoreInput({ question, state, onChange, onSubmit }) {
  const { t } = useLang();
  const max = maxMarks(question);
  return (
    <div className="selfin">
      <label htmlFor="selfIn">{t(`अपने अंक लिखें (0 से ${max})`)}</label>
      <div className="selfrow">
        <input
          id="selfIn"
          type="text"
          inputMode="numeric"
          maxLength={2}
          autoComplete="off"
          value={state.sraw}
          className={state.sv != null ? 'on' : undefined}
          disabled={state.done}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && state.sv != null) onSubmit();
          }}
        />
        <span className="muted">/ {max}</span>
      </div>
      {state.sbad && (
        <p className="err">
          {t(`कृपया 0 से ${max} के बीच पूरा अंक लिखें।`)}
        </p>
      )}
    </div>
  );
}
