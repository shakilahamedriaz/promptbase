import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

// ── Node map ──────────────────────────────────────────────────────────────────
const NODES = {
  i1: { x: 12,  y: 22,  label: 'write a blog post…',  layer: 'input'  },
  i2: { x: 12,  y: 50,  label: 'explain quantum…',     layer: 'input'  },
  i3: { x: 12,  y: 78,  label: 'summarize this doc…',  layer: 'input'  },
  h1: { x: 38,  y: 15,  label: null,                   layer: 'hidden' },
  h2: { x: 42,  y: 38,  label: null,                   layer: 'hidden' },
  h3: { x: 38,  y: 62,  label: null,                   layer: 'hidden' },
  h4: { x: 42,  y: 84,  label: null,                   layer: 'hidden' },
  c1: { x: 62,  y: 30,  label: null,                   layer: 'core'   },
  c2: { x: 62,  y: 70,  label: null,                   layer: 'core'   },
  o1: { x: 86,  y: 20,  label: 'Structured prompt',    layer: 'output' },
  o2: { x: 86,  y: 50,  label: 'Expert persona set',   layer: 'output' },
  o3: { x: 86,  y: 80,  label: 'Context enriched',     layer: 'output' },
} as const;

type NodeId = keyof typeof NODES;

const EDGES: [NodeId, NodeId, number][] = [
  ['i1','h1',1.4], ['i1','h2',2.1], ['i1','h3',2.8],
  ['i2','h1',1.8], ['i2','h2',1.2], ['i2','h4',2.4],
  ['i3','h2',3.0], ['i3','h3',1.6], ['i3','h4',1.0],
  ['h1','c1',1.5], ['h2','c1',2.0], ['h2','c2',2.5],
  ['h3','c1',3.2], ['h3','c2',1.3], ['h4','c2',1.8],
  ['c1','o1',1.6], ['c1','o2',2.2], ['c1','o3',3.0],
  ['c2','o1',2.8], ['c2','o2',1.4], ['c2','o3',1.9],
];

const NODE_IDS = Object.keys(NODES) as NodeId[];
const NODE_DELAYS: Record<string, number> = Object.fromEntries(
  NODE_IDS.map((id, i) => [id, i * 0.07])
);

// Light-bg friendly colors — saturated enough to show on white
const LAYER_COLORS: Record<string, string> = {
  input:  'rgba(99,102,241,0.85)',
  hidden: 'rgba(124,58,237,0.65)',
  core:   'rgba(109,40,217,0.9)',
  output: 'rgba(5,150,105,0.85)',
};

const LAYER_GLOW: Record<string, string> = {
  input:  'rgba(99,102,241,0.15)',
  hidden: 'rgba(124,58,237,0.12)',
  core:   'rgba(109,40,217,0.18)',
  output: 'rgba(5,150,105,0.15)',
};

function NeuralNetwork() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.55 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="node-blur">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Static connection lines */}
      {EDGES.map(([a, b], i) => {
        const na = NODES[a]; const nb = NODES[b];
        const isOutput = nb.layer === 'output' || na.layer === 'core';
        return (
          <line
            key={i}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={isOutput ? 'rgba(5,150,105,0.22)' : 'rgba(99,102,241,0.2)'}
            strokeWidth="0.35"
          />
        );
      })}

      {/* Animated flow pulses */}
      {EDGES.filter((_, i) => i % 3 === 0).map(([a, b, delay], i) => {
        const na = NODES[a]; const nb = NODES[b];
        const isOutput = nb.layer === 'output';
        return (
          <line
            key={`flow-${i}`}
            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={isOutput ? 'rgba(5,150,105,0.55)' : 'rgba(124,58,237,0.5)'}
            strokeWidth="0.45"
            strokeDasharray="4 196"
            strokeLinecap="round"
            style={{
              animation: `neural-flow ${2 + delay * 0.4}s linear infinite`,
              animationDelay: `${delay * 0.3}s`,
            }}
          />
        );
      })}

      {/* Nodes */}
      {NODE_IDS.map(id => {
        const n = NODES[id];
        const color = LAYER_COLORS[n.layer];
        const glow  = LAYER_GLOW[n.layer];
        const r     = n.layer === 'core' ? 2.2 : n.layer === 'input' || n.layer === 'output' ? 1.6 : 1.2;
        return (
          <g key={id} style={{ animation: `auth-node-enter 0.5s ease-out both`, animationDelay: `${NODE_DELAYS[id]}s` }}>
            <circle cx={n.x} cy={n.y} r={r + 2} fill={glow} />
            <circle cx={n.x} cy={n.y} r={r} fill={color} filter="url(#node-blur)" />
            {n.layer === 'core' && (
              <circle
                cx={n.x} cy={n.y} r={r + 0.5}
                fill="none"
                stroke="rgba(109,40,217,0.4)"
                strokeWidth="0.3"
                style={{ animation: 'auth-ping 2.5s ease-out infinite', transformOrigin: `${n.x}px ${n.y}px` }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

const CHIPS = [
  { label: 'GPT-4o',      bg: 'rgba(16,163,127,0.08)',  border: 'rgba(16,163,127,0.25)',  text: '#047857' },
  { label: 'Claude',      bg: 'rgba(180,130,40,0.08)',   border: 'rgba(180,130,40,0.25)',  text: '#92400e' },
  { label: 'Gemini',      bg: 'rgba(37,99,235,0.08)',    border: 'rgba(37,99,235,0.25)',   text: '#1d4ed8' },
  { label: 'Llama',       bg: 'rgba(109,40,217,0.08)',   border: 'rgba(109,40,217,0.25)',  text: '#6d28d9' },
  { label: 'Perplexity',  bg: 'rgba(13,148,136,0.08)',   border: 'rgba(13,148,136,0.25)',  text: '#0f766e' },
  { label: 'Grok',        bg: 'rgba(71,85,105,0.08)',    border: 'rgba(71,85,105,0.22)',   text: '#475569' },
];

function OutputCard() {
  return (
    <div
      className="w-[228px] rounded-xl p-3.5"
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(109,40,217,0.18)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 12px 40px rgba(99,102,241,0.13), 0 2px 8px rgba(0,0,0,0.06)',
        animation: 'auth-node-enter 0.6s ease-out both',
        animationDelay: '0.4s',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <div
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: '#059669', animation: 'auth-glow-pulse 2s ease-in-out infinite' }}
        />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: '#059669', letterSpacing: '0.1em' }}>
          REFINED
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
        <span style={{ color: '#6d28d9' }}>You are a senior writer.</span>
        {' '}Write a structured explainer on AI for tech-curious readers with 3 real-world examples.
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: '#94A3B8' }}>Quality score</span>
        <span className="text-[11px] font-bold" style={{ color: '#059669' }}>91 / 100</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: '91%', background: 'linear-gradient(90deg, #7c3aed, #059669)' }} />
      </div>
    </div>
  );
}

export function AuthVisual() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden select-none"
      style={{ background: '#F4F3F8' }}
      aria-hidden="true"
    >
      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Neural network fills the panel as background */}
      <NeuralNetwork />

      {/* Gradient shield — fades out the neural network behind the top text block
          so headline + stats always read clearly against the plain bg colour */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background:
            'linear-gradient(to bottom, #F4F3F8 0%, #F4F3F8 28%, rgba(244,243,248,0.6) 48%, transparent 68%)',
        }}
      />

      {/* ── Top: branding, headline, stats ──────────────────────────── */}
      <div className="relative z-10 shrink-0 px-10 pt-10">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-9">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.22)' }}
          >
            <SparklesIcon className="h-3.5 w-3.5" style={{ color: '#7c3aed' }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: '#6d28d9', letterSpacing: '-0.01em' }}>
            PromptVault Pro
          </span>
        </div>

        {/* Headline */}
        <h2
          className="font-extrabold leading-tight mb-3"
          style={{
            fontSize: 'clamp(24px, 2.6vw, 32px)',
            letterSpacing: '-0.03em',
            color: '#1e293b',
            textWrap: 'balance',
          } as React.CSSProperties}
        >
          Raw prompts,<br />
          <span style={{ color: '#7c3aed' }}>refined into results.</span>
        </h2>

        <p className="text-[13px] mb-8" style={{ color: '#64748b', lineHeight: '1.65', maxWidth: 248 }}>
          Save, organize, and refine prompts across every AI platform.
        </p>

        {/* Stats */}
        <div className="flex items-start gap-8">
          {[
            { value: '50k+', label: 'Prompts refined' },
            { value: '6',    label: 'AI platforms'    },
            { value: '4.9★', label: 'User rating'     },
          ].map(s => (
            <div key={s.label}>
              <p
                className="text-[15px] font-bold"
                style={{ color: '#1e293b', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
              >
                {s.value}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Middle: grows, OutputCard anchored to bottom-right ──────── */}
      <div className="relative z-10 flex-1 flex items-end justify-end px-6 pb-5">
        <OutputCard />
      </div>

      {/* ── Bottom: platform chips ───────────────────────────────────── */}
      <div className="relative z-10 shrink-0 px-10 pb-9">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map(c => (
            <div
              key={c.label}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
