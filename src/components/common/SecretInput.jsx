import { useState } from 'react';
import { useLang } from '@/context/LanguageContext';
import Icon from './Icon';

/** Password-style input with an eye button to show or hide what was typed. */
export default function SecretInput({ value, onChange, inputMode, placeholder }) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);
  return (
    <span className="secret">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />
      <button
        type="button"
        className="secret-eye"
        aria-label={t(shown ? 'छिपाएँ' : 'दिखाएँ')}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
      >
        <Icon name={shown ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </span>
  );
}
