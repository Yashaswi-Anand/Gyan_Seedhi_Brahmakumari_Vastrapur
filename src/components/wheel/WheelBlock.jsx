import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useLang } from '@/context/LanguageContext';
import { WISH, WISH_HEAD, wishAt } from '@/data/vardans';
import { hasPlayedToday } from '@/services/stats';
import { todayKey } from '@/utils/date';
import VardanWheel, { targetRotation } from './VardanWheel';

const SPIN_MS = 4200;

/** Vardan wheel card: spin once a day after finishing the practice, then show the vardan. */
export default function WheelBlock() {
  const { user, recordSpin } = useApp();
  const { t, v } = useLang();
  const [spinTo, setSpinTo] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const idx = user.spins[todayKey()];
  const done = idx != null;
  const spinning = spinTo != null && !done;
  const rotation = done ? targetRotation(idx) : spinning ? targetRotation(spinTo) : 0;

  const spin = () => {
    if (done || spinning || !hasPlayedToday(user)) return;
    const pick = Math.floor(Math.random() * WISH.length);
    setSpinTo(pick);
    timer.current = setTimeout(() => recordSpin(pick), SPIN_MS);
  };

  return (
    <div className="card wcard">
      <h3 style={{ fontSize: 23 }}>{t('वरदान चक्र')}</h3>
      <p className="tiny" style={{ marginTop: -6 }}>{v(WISH_HEAD)}</p>
      <p className="muted small">{t(done ? 'आज का वरदान आपको मिल चुका है' : 'चक्र को एक बार घुमाएँ')}</p>
      <div className="wheelwrap">
        <VardanWheel rotation={rotation} spinning={spinning} />
      </div>
      {done ? (
        <div className="wish">
          <h3>{v(wishAt(idx).w)}</h3>
          <p>{v(wishAt(idx).t)}</p>
        </div>
      ) : (
        <button className="btn" onClick={spin} disabled={spinning}>
          {t('चक्र घुमाएँ')}
        </button>
      )}
    </div>
  );
}
