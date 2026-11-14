import { useLang } from '@/context/LanguageContext';
import { treeStage } from '@/services/stats';
import GrowthTree from './GrowthTree';

/** Tree with its stage caption underneath (used on the home hero card). */
export default function TreeBox({ leaves }) {
  const { t } = useLang();
  return (
    <div className="treebox">
      <GrowthTree leaves={leaves} />
      <p className="tl">{t(`${treeStage(leaves)} · ${leaves} पत्ते`)}</p>
    </div>
  );
}
