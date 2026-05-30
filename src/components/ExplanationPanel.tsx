import { useSimulationStore, WAVE_SPEED } from '../store/useSimulationStore';

function getExplanation(vOverC: number, frequency: number): {
  title: string;
  body: string;
} {
  const v = vOverC;
  const f = frequency;
  const lambdaFront = ((1 - v) / f) * WAVE_SPEED;
  const lambdaBack = ((1 + v) / f) * WAVE_SPEED;

  if (v < 0.02) {
    return {
      title: '静止波源',
      body: '波面は同心円状に等間隔で広がります。観測者がどの方向にいても、聞こえる周波数は発信周波数と同じです。',
    };
  }
  if (v < 0.95) {
    return {
      title: '亜音速の移動',
      body: `波源が進行方向に動くため、前方では波面間隔が縮み (λ前 ≈ ${lambdaFront.toFixed(
        2,
      )})、高い周波数として観測されます。後方では伸びて (λ後 ≈ ${lambdaBack.toFixed(
        2,
      )}) 低くなります。これがドップラー効果です。`,
    };
  }
  if (v < 1.02) {
    return {
      title: '音速 (v ≈ c)',
      body: '波源が音速に達すると、前方の波面はすべて一点に集中し、強い圧力の壁が形成されます (音の壁)。',
    };
  }
  const machAngleDeg = (Math.asin(1 / v) * 180) / Math.PI;
  return {
    title: '超音速 (v > c)',
    body: `波源が波より速く進むため、波面の包絡線が円錐状になり衝撃波 (マッハコーン) を形成します。マッハ角は約 ${machAngleDeg.toFixed(
      1,
    )}°。コーンの外側では波はまだ届きません。`,
  };
}

export function ExplanationPanel() {
  const vOverC = useSimulationStore((s) => s.vOverC);
  const frequency = useSimulationStore((s) => s.frequency);
  const show = useSimulationStore((s) => s.showExplanation);
  if (!show) return null;
  const { title, body } = getExplanation(vOverC, frequency);
  return (
    <div className="explanation">
      <div className="explanation-title">{title}</div>
      <div className="explanation-body">{body}</div>
    </div>
  );
}
