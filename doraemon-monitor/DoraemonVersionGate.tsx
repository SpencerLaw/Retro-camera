import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, History, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DoraemonMonitorApp from './DoraemonMonitorApp';
import type { DoraemonVariant } from './types';
import campusPreviewUrl from './assets/campus-signal-preview.png';
import pocketPreviewUrl from './assets/pocket-classroom-preview.png';
import './doraemon-modern.css';

type VariantOption = {
  readonly value: DoraemonVariant;
  readonly name: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly meta: string;
  readonly previewUrl: string;
  readonly theme: 'campus' | 'pocket';
};

const FEATURED_VARIANTS = [
  {
    value: 'campus',
    name: '校园声场',
    eyebrow: '深色课堂大屏',
    description: '更强的远距离识别，让全班一眼读懂声场状态。',
    meta: '推荐投屏与大教室',
    previewUrl: campusPreviewUrl,
    theme: 'campus'
  },
  {
    value: 'pocket',
    name: '未来口袋教室',
    eyebrow: '浅色自习设备',
    description: '清爽明亮的教学设备感，适合日常自习与触控操作。',
    meta: '推荐日常课堂与触控屏',
    previewUrl: pocketPreviewUrl,
    theme: 'pocket'
  }
] as const satisfies readonly VariantOption[];

const LEGACY_VARIANT = {
  value: 'legacy',
  name: '旧版',
  description: '继续使用当前稳定界面，布局与操作习惯原样保留。'
} as const;

const DoraemonVersionGate: React.FC = () => {
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<DoraemonVariant | null>(null);

  if (selectedVariant) {
    return (
      <DoraemonMonitorApp
        variant={selectedVariant}
        onChooseVersion={() => setSelectedVariant(null)}
      />
    );
  }

  return (
    <main className="dm-version-gate">
      <header className="dm-gate-header">
        <div className="dm-gate-brand">
          <span className="dm-brand-mark" aria-hidden="true">
            <span className="dm-brand-eye dm-brand-eye--left" />
            <span className="dm-brand-eye dm-brand-eye--right" />
            <span className="dm-brand-nose" />
          </span>
          <span className="dm-gate-brand-copy">
            <strong>哆啦A梦教室</strong>
            <small>CLASSROOM SOUND MONITOR</small>
          </span>
        </div>
        <button type="button" className="dm-gate-back" onClick={() => navigate('/')} aria-label="返回应用中心">
          <ArrowLeft size={19} aria-hidden="true" />
          <span>返回应用中心</span>
        </button>
      </header>

      <div className="dm-gallery-shell">
        <section className="dm-gallery-intro" aria-labelledby="dm-version-title">
          <div className="dm-gallery-release"><Sparkles size={15} aria-hidden="true" /> 两套新界面已就绪</div>
          <h1 id="dm-version-title">
            <span>今天，</span>
            <span>想用哪一间</span>
            <span>教室？</span>
          </h1>
          <p>同一套监测功能，换一种更适合课堂的观看方式。</p>
          <div className="dm-gallery-assurance" aria-label="版本切换说明">
            <span><Check size={15} aria-hidden="true" /> 授权不受影响</span>
            <span><Check size={15} aria-hidden="true" /> 报告数据互通</span>
            <span><Check size={15} aria-hidden="true" /> 随时可以切换</span>
          </div>
        </section>

        <section className="dm-featured-versions" aria-label="新版界面">
          {FEATURED_VARIANTS.map((option, index) => (
            <button
              type="button"
              className={`dm-gallery-card dm-gallery-card--${option.theme}`}
              key={option.value}
              onClick={() => setSelectedVariant(option.value)}
            >
              <span className="dm-gallery-media">
                <img className="dm-version-image" src={option.previewUrl} alt="" />
                <span className="dm-gallery-media-shade" />
                <span className="dm-gallery-badge">{index === 0 ? '首选推荐' : '明亮新款'}</span>
                <span className="dm-gallery-number">0{index + 1}</span>
              </span>
              <span className="dm-gallery-card-copy">
                <span className="dm-gallery-card-heading">
                  <span>
                    <small>{option.eyebrow}</small>
                    <strong>{option.name}</strong>
                  </span>
                  <span className="dm-gallery-arrow"><ArrowUpRight size={23} aria-hidden="true" /></span>
                </span>
                <span className="dm-gallery-description">{option.description}</span>
                <span className="dm-gallery-meta">{option.meta}</span>
              </span>
            </button>
          ))}
        </section>

        <button type="button" className="dm-legacy-lane" onClick={() => setSelectedVariant(LEGACY_VARIANT.value)}>
          <span className="dm-legacy-icon"><History size={22} aria-hidden="true" /></span>
          <span className="dm-legacy-copy">
            <small>CLASSIC · 当前稳定版本</small>
            <strong>{LEGACY_VARIANT.name}</strong>
            <span>{LEGACY_VARIANT.description}</span>
          </span>
          <span className="dm-legacy-action">使用旧版 <ChevronRight size={19} aria-hidden="true" /></span>
        </button>

        <footer className="dm-gallery-footer">
          <span>03 个可选版本</span>
          <span>选择只改变外观，不改变课堂监测逻辑</span>
        </footer>
      </div>
    </main>
  );
};

export default DoraemonVersionGate;
