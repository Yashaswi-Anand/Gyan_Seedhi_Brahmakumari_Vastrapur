import { useLang } from '@/context/LanguageContext';
import { daysInMonth, treeStage } from '@/services/stats';
import GrowthTree from './GrowthTree';

/** Tree with its stage caption underneath (used on the home hero card). */
export default function TreeBox({ leaves }) {
  const { t } = useLang();
  const total = daysInMonth();
  return (
    <div className="treebox">
      <GrowthTree leaves={leaves} total={total} />
      <p className="tl">{t(`${treeStage(leaves, total)} · ${leaves} / ${total} पत्ते`)}</p>
    </div>
  );
}
