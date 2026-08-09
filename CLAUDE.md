# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

高校生向けドップラー効果学習用 Web 教材（React + TypeScript + Vite）。`要件.md` が一次仕様書で、本実装はそこに従って構築されている（要件 §18 のディレクトリ構成を踏襲）。

## コマンド

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b && vite build (型チェック + 本番ビルド)
npm run preview  # ビルド成果物の検証
```

テストランナーは未導入（要件外）。

## アーキテクチャ

### 全体構造：3 層分離

```
Zustand store ──► React コンポーネント ──► アニメーションループ ──► SimulationCore.update()
       │                  │                                              │
       └──────────────────┴──► (Canvas|Three)Renderer.draw(core, opts) ◄─┘
```

1. **`core/SimulationCore.ts`** — 純粋クラス、React 非依存。時間 `t`、波源位置、波面配列を保持。`useRef` 経由でコンポーネントに保持される。**要件 §5.1 に従い波動方程式は解かない**。代わりに「波源から一定周期 `1/f` で波面（円）が放射され、`radius = c*(t - emitTime)` で拡大する」モデル。
2. **`renderers/`** — 描画専用。core を読み取って描画するだけで、core を変更しない。`CanvasRenderer`（2D, Canvas2D API）、`ThreeRenderer`（3D, Three.js + OrbitControls）、`GraphRenderer`（波形/周波数）。
3. **`store/useSimulationStore.ts`** — Zustand。ユーザー操作で変わるパラメータのみ。時間や波面など「シミュ進行で変わるもの」は core 側、store には入れない。

### 鍵となる設計判断

- **`SimulationCore.getWaveAt(x, y)` の解析解**：プローブ/ヒートマップの観測点振幅を、遅延時刻方程式を二次式で解析的に解いて求める（数値反復しない）。`v < c` / `v ≈ c` / `v > c` の 3 分岐。**因果律のため `0 ≤ retarded time ≤ t` を厳守**（これを忘れると波がまだ届いていない領域に「反射」のような偽信号が出る）。

- **速度履歴（区分線形軌跡）**：シミュ途中で `v/c` が変わってもヒートマップが波面とズレないよう、`velocityHistory: VelocitySegment[]` で「いつ・どこから・どの速度で動き始めたか」を保持する。`getWaveAt` は履歴の各セグメントごとに遅延時刻方程式を解き、`tPrime ∈ [seg.startTime, segEnd]` を満たす解を集計。スライダー連続ドラッグ対策で、速度差 > 0.005 かつ前回から 0.1s 以上経過したときだけ新セグメントを追加（しきい値以下は既存セグメントを継続）。`maxRadius/c` を超える古いセグメントは prune、ハードキャップ 16。

- **プローブの観測値共有**：`core/probeRegistry.ts` がモジュールスコープの `Map<probeId, ProbeAnalyzer>` を保持し、SimulationCanvas（書き手：毎フレーム `addSample`）と WaveformPanel / FrequencyPanel（読み手：毎フレーム描画）の間でアナライザを共有する。store にサンプル配列を入れないのは、サンプルが秒間 60 件追加されることで再レンダーが暴走するのを避けるため。

- **比較表示モード**：単一の core を共有せず、`SimulationCanvas` を 2 インスタンス並べて、上は `vOverCOverride={0}`（静止）、下は store の値（移動）。プローブは下（移動）側のみ `enableProbes`。

- **2D / 3D 切替**：`store.viewMode` で `SimulationCanvas` か `Simulation3DCanvas` を出し分け。3D は **常時アニメーションループを走らせる**（一時停止中も OrbitControls の慣性カメラを動かすため）。`if (playing) core.update(dt)` でシミュ進行だけを条件化、`renderer.draw()` は毎フレーム。

- **3D 負荷対策**：半透明ソリッドの半球殻はオーバードローが効くので、`store.wavefrontMaxAge` で「特定時間より古い波面は描画スキップ」を実装。`SphereGeometry(r, W, H, phiStart=π, phiLength=π, 0, π)` で「右半分（進行方向 +X を向いて右側）」だけのジオメトリを直接生成し、床より下は per-material `clippingPlanes` でカット。

- **Three.js のクリッピング**：`renderer.localClippingEnabled = true` にし、`clippingPlanes` を **マテリアル個別** に設定する（グローバルにかけると波源球まで切れる）。

### ファイル責務マップ

- `core/SimulationCore.ts` — 時間更新・波面放射・波面破棄（`maxRadius` 超過）・`getWaveAt` 解析解
- `core/ProbeAnalyzer.ts` — リングバッファ的なサンプル保持＋ゼロクロス周波数推定
- `core/probeRegistry.ts` — analyzer のグローバル Map（プローブ id ↔ ProbeAnalyzer）
- `core/WaveSource.ts`, `core/Wavefront.ts` — 型 re-export のみ（要件 §18 互換用の薄いファイル）
- `renderers/CanvasRenderer.ts` — 2D 描画一式（波面・矢印・ガイド・プローブ・**オフスクリーン 220×220 ヒートマップ**）。`screenToSim` / `simToScreen` 座標変換も提供
- `renderers/ThreeRenderer.ts` — 3D シーン（半球殻プール・マッハコーン・床グリッド・カメラ）
- `renderers/GraphRenderer.ts` — 2D グラフ汎用（波形・周波数で共用）
- `hooks/useAnimationLoop.ts` — RAF ラッパー、`dt` を 1/30 にクランプ
- `hooks/useProbeInteraction.ts` — Canvas クリック → プローブ追加 / 右クリック → 削除 / ドラッグ → 移動

### 内部単位系

要件 §5.4 に従い `c = 1.0` 固定の内部単位。`SIM_VIEW_WIDTH = 60`（CanvasRenderer）、`FLOOR_GRID_SIZE = 80`（ThreeRenderer）でビューポートを定義。store の `vOverC` は比率（0〜1.5）で、実速度は `vOverC * WAVE_SPEED`。

### 拡張時の注意

- 新しい store 値を追加したら、`SimulationCanvas` / `Simulation3DCanvas` の `useEffect` 依存配列にも忘れず入れる（特に「ポーズ中の再描画」効果）。
- core を変更するときは「2D と 3D 両方で同じ core クラスを使っている」ことを意識する。3D 専用のフィルタは renderer 側に持たせる（例：`wavefrontMaxAge` フィルタ）。
- 解析解 `getWaveAt` の v < c / v = c / v > c の分岐は全部独立に `T ≤ t` チェックがあるので、改修時はすべて触ること。
