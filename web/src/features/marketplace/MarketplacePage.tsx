import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FireIcon,
  SparklesIcon,
  LockClosedIcon,
  XMarkIcon,
  CheckIcon,
  ChevronRightIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { showToast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketPrompt {
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
  author: { name: string; avatar: string; verified: boolean };
  price: number; // 0 = free
  downloads: number;
  rating: number;
  ratingCount: number;
  quality_score: number;
  featured?: boolean;
  trending?: boolean;
  new?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROMPTS: MarketPrompt[] = [
  {
    id: 'm1',
    title: 'Senior Software Engineer Code Reviewer',
    description: 'Gets precise, production-ready feedback on any code — security issues, performance bottlenecks, and architectural improvements included.',
    body: `You are a senior software engineer with 15+ years of experience in production systems. Review the following code with the critical eye of a principal engineer doing a pre-merge review.

For each issue you find, provide:
1. **Severity** (Critical / High / Medium / Low)
2. **Location** (file + line if known)
3. **Problem** — what is wrong and why it matters
4. **Fix** — the corrected code or a concrete suggestion

After the issue list, provide:
- A **summary score** (1-10) with one sentence justification
- The **top 3 things done well**
- The **single most important change** to make before merging

Code to review:
\`\`\`
{{paste_code_here}}
\`\`\`

Assume this is going to a production system handling 10k+ daily users.`,
    category: 'Coding',
    tags: ['code-review', 'engineering', 'production', 'security'],
    author: { name: 'DevCraft', avatar: 'DC', verified: true },
    price: 0,
    downloads: 14820,
    rating: 4.9,
    ratingCount: 312,
    quality_score: 94,
    featured: true,
    trending: true,
  },
  {
    id: 'm2',
    title: 'Viral LinkedIn Post Generator',
    description: 'Turns any topic or career win into a compelling, algorithm-friendly LinkedIn post that drives genuine engagement.',
    body: `You are a top LinkedIn content strategist who has helped founders and executives grow to 100k+ followers. Write a LinkedIn post about the following topic that feels authentic, not salesy.

Topic: {{topic_or_story}}
My background: {{your_role_and_industry}}
Goal: {{awareness / leads / thought_leadership}}

Post structure to follow:
- **Hook** (first line — must stop the scroll, use a surprising stat, bold claim, or relatable moment)
- **Body** (3-5 short paragraphs, max 3 lines each, white space is key)
- **Insight or lesson** (the "so what" — make it genuinely useful)
- **Call to action** (one clear ask — question for comments, or link in bio)

Tone: conversational but authoritative. No jargon. No "I'm thrilled to announce."
Length: 150-250 words.
Formatting: short paragraphs, strategic line breaks, 2-3 relevant emojis max.`,
    category: 'Marketing',
    tags: ['linkedin', 'social-media', 'writing', 'personal-brand'],
    author: { name: 'GrowthStudio', avatar: 'GS', verified: true },
    price: 2.99,
    downloads: 8430,
    rating: 4.7,
    ratingCount: 189,
    quality_score: 88,
    featured: true,
  },
  {
    id: 'm3',
    title: 'Socratic Tutor for Any Subject',
    description: 'Teaches through questions instead of answers — builds deep understanding rather than surface-level memorization.',
    body: `You are a master Socratic tutor — you never give direct answers, you guide students to discover them through carefully sequenced questions.

Subject: {{subject_or_topic}}
Student level: {{beginner / intermediate / advanced}}
Student's current understanding: {{what_they_know_so_far}}

Your approach:
1. Assess what the student already knows by asking one open question
2. Identify the core misconception or gap based on their response
3. Ask a sequence of 2-3 targeted questions that lead them toward the insight
4. When they arrive at the correct understanding, affirm it and deepen it with "What would happen if...?" questions
5. Never lecture. If they're stuck after 3 guesses, give a minimal hint — not the answer.

Begin with: "What do you already know about {{topic}}?"`,
    category: 'Education',
    tags: ['tutoring', 'learning', 'socratic', 'teaching'],
    author: { name: 'EduForge', avatar: 'EF', verified: false },
    price: 0,
    downloads: 6210,
    rating: 4.8,
    ratingCount: 97,
    quality_score: 91,
    trending: true,
  },
  {
    id: 'm4',
    title: 'Cold Email That Actually Gets Replies',
    description: 'A battle-tested cold email framework used by top SDRs — personalised, concise, and built around the prospect\'s pain, not your pitch.',
    body: `You are a top-performing sales development rep who consistently achieves 40%+ reply rates on cold outreach. Write a cold email for the following scenario.

Prospect: {{name}}, {{title}} at {{company}}
What they likely care about: {{pain_point_or_goal}}
What I'm offering: {{product_or_service_one_line}}
My company: {{your_company}}
Any personal hook / research: {{linkedin_post_recent_news_or_connection}}

Email requirements:
- Subject line: under 8 words, pattern-interrupt, no "Quick question" or "Following up"
- Opening: reference the personal hook — show you did research (1 sentence)
- Problem statement: name the pain they feel, not the features you have (1-2 sentences)
- Value proof: one specific, quantified result ("helped X achieve Y in Z") (1 sentence)
- CTA: one low-friction ask — "worth a 15-min call this week?" or "does this resonate?"
- Total length: under 100 words

No bullet points. No "I hope this finds you well." No passive voice.`,
    category: 'Business',
    tags: ['sales', 'email', 'outreach', 'copywriting'],
    author: { name: 'SalesLab', avatar: 'SL', verified: true },
    price: 4.99,
    downloads: 11200,
    rating: 4.6,
    ratingCount: 254,
    quality_score: 92,
    featured: true,
  },
  {
    id: 'm5',
    title: 'Worldbuilder — Create a Rich Fictional Universe',
    description: 'Systematically builds a complete, internally consistent fictional world — geography, history, cultures, magic systems, and conflicts.',
    body: `You are a master worldbuilder and fantasy/sci-fi author. Help me build a rich, internally consistent fictional universe from the following seed idea.

Seed concept: {{one_sentence_core_idea}}
Genre: {{fantasy / sci-fi / dystopian / alternate_history / other}}
Tone: {{dark_and_gritty / hopeful / satirical / epic / intimate}}

Build the world across these dimensions (go deep on each):

**1. GEOGRAPHY & ENVIRONMENT**
- Physical landscape, climate zones, notable locations
- How the environment shapes culture and conflict

**2. HISTORY & MYTHOLOGY**
- Founding myth / creation story
- Two or three defining historical events that still echo today
- Factions, empires, or civilisations that rose and fell

**3. PEOPLES & CULTURES**
- 2-3 distinct groups with unique values, aesthetics, and tensions
- What they each want and fear

**4. POWER SYSTEMS**
- Magic, technology, or social hierarchy that drives plot
- Its rules, costs, and limits (a power with no cost is boring)

**5. CURRENT CONFLICTS**
- The central tension the story will explore
- Three factions with competing legitimate claims

End with: "The Chekhov's Gun" — one specific, planted detail that could pay off dramatically later.`,
    category: 'Creative',
    tags: ['worldbuilding', 'fiction', 'fantasy', 'writing'],
    author: { name: 'NarrativeLab', avatar: 'NL', verified: true },
    price: 0,
    downloads: 9870,
    rating: 4.9,
    ratingCount: 143,
    quality_score: 96,
    new: true,
  },
  {
    id: 'm6',
    title: 'Data Analysis Report Generator',
    description: 'Transforms raw data or CSV descriptions into a structured analytical report with key insights, trends, and actionable recommendations.',
    body: `You are a senior data analyst at a top-tier consulting firm. Analyse the following data and produce a professional analytical report.

Data / context: {{paste_data_or_describe_dataset}}
Business question to answer: {{what_decision_does_this_data_need_to_inform}}
Audience: {{executive_team / data_team / non_technical_stakeholders}}

Report structure:
1. **Executive Summary** (3 bullet points — the most critical findings, written for a busy CEO)
2. **Key Findings** (5-7 insights, each with: observation → supporting evidence → business implication)
3. **Trend Analysis** (identify patterns, anomalies, and seasonality)
4. **Risk Flags** (what the data suggests could go wrong — be specific)
5. **Recommendations** (3 prioritised actions, each with: action → expected outcome → effort level)
6. **Data Caveats** (limitations of this analysis — what we don't know)

Use precise language. Quantify everything that can be quantified. Flag correlations vs causation explicitly.`,
    category: 'Analysis',
    tags: ['data', 'analytics', 'reporting', 'business-intelligence'],
    author: { name: 'DataForge', avatar: 'DF', verified: true },
    price: 3.99,
    downloads: 5640,
    rating: 4.5,
    ratingCount: 78,
    quality_score: 89,
  },
  {
    id: 'm7',
    title: 'Debate Both Sides — Steel-Man Any Argument',
    description: 'Forces rigorous thinking by presenting the strongest possible version of both sides of any controversial topic.',
    body: `You are a professional debate coach and critical thinking expert. Present the strongest possible case for BOTH sides of the following topic — not strawmen, but fully steel-manned arguments.

Topic: {{controversial_topic_or_question}}

For each side:
1. **Core claim** — the most defensible version of this position (one crisp sentence)
2. **Best arguments** (3 strongest points, each with evidence or reasoning)
3. **Strongest evidence** — specific studies, examples, or data that supports this side
4. **Who holds this view and why** — the most reasonable, thoughtful person who believes this
5. **What the other side gets wrong** — the most powerful critique from this perspective

Then provide:
- **The crux** — the single factual or values disagreement that, if resolved, would settle the debate
- **Your meta-observation** — what both sides are missing or assuming

Remain completely neutral. Your goal is to make someone who reads this understand both sides so well they could argue either in a debate.`,
    category: 'Research',
    tags: ['critical-thinking', 'debate', 'analysis', 'philosophy'],
    author: { name: 'ThinkTank', avatar: 'TT', verified: false },
    price: 0,
    downloads: 4320,
    rating: 4.7,
    ratingCount: 64,
    quality_score: 87,
    new: true,
  },
  {
    id: 'm8',
    title: 'Technical Documentation Writer',
    description: 'Converts rough notes, code, or feature descriptions into polished, developer-friendly documentation.',
    body: `You are a senior technical writer with experience at top developer-tools companies (Stripe, Twilio, Vercel). Transform the following into polished technical documentation.

Input (raw notes / code / feature description):
{{paste_raw_content}}

Documentation type: {{API_reference / tutorial / how-to_guide / architecture_overview / README}}
Target audience: {{junior_devs / senior_engineers / non_technical_stakeholders}}
Tone: {{formal / conversational / terse}}

Documentation must include:
- **Overview** — what this does and why it matters (2-3 sentences, no jargon)
- **Prerequisites** — what the reader needs to know or have installed
- **Step-by-step instructions** — numbered, one action per step, with code blocks
- **Parameters / Options table** — if relevant (name | type | required | description)
- **Example** — a complete working example with expected output
- **Common errors** — 2-3 things that go wrong and how to fix them
- **Next steps** — where to go after completing this

Write as if a developer at 2am, blocked on a deadline, will read this. Make it scannable.`,
    category: 'Coding',
    tags: ['documentation', 'technical-writing', 'developer', 'api'],
    author: { name: 'DevCraft', avatar: 'DC', verified: true },
    price: 0,
    downloads: 7820,
    rating: 4.8,
    ratingCount: 156,
    quality_score: 93,
    trending: true,
  },
  {
    id: 'm9',
    title: 'Startup Pitch Deck Narrative Builder',
    description: 'Builds the story arc and key slides for a compelling VC pitch — from problem framing to ask, structured like top-funded pitches.',
    body: `You are a startup advisor who has helped companies raise Series A+ funding from top-tier VCs. Build the narrative and content outline for a compelling pitch deck.

Startup details:
- Company: {{company_name}}
- What it does: {{one_sentence_description}}
- Target customer: {{who_buys_this}}
- Problem being solved: {{pain_point}}
- How it solves it: {{solution_mechanism}}
- Traction (if any): {{metrics_or_milestones}}
- Ask: {{funding_amount_and_use}}

Build the complete deck narrative across these slides:
1. **Title** — tagline that makes investors lean forward
2. **Problem** — make them feel the pain viscerally (not just describe it)
3. **Solution** — "aha" moment, not a feature list
4. **Why Now** — the timing insight that makes this a must-act-now opportunity
5. **Market Size** — TAM/SAM/SOM with bottom-up logic, not top-down guesses
6. **Product** — 3 key capabilities tied to customer outcomes
7. **Traction** — the numbers that prove people want this
8. **Business Model** — how you make money and why it scales
9. **Team** — why YOU are uniquely positioned to win this
10. **Ask** — how much, what it unlocks, 18-month milestones

For each slide: headline (one bold claim) + 3 supporting bullet points.`,
    category: 'Business',
    tags: ['startup', 'pitch', 'fundraising', 'venture-capital'],
    author: { name: 'FounderOS', avatar: 'FO', verified: true },
    price: 9.99,
    downloads: 3180,
    rating: 4.6,
    ratingCount: 42,
    quality_score: 95,
    featured: true,
  },
  {
    id: 'm10',
    title: 'SEO Blog Post Outline Generator',
    description: 'Creates fully optimised blog post structures with H-tags, keyword placement strategy, and internal linking opportunities.',
    body: `You are an SEO strategist and content architect who has helped blogs reach 500k+ monthly organic visitors. Create a comprehensive, SEO-optimised blog post outline.

Target keyword: {{primary_keyword}}
Secondary keywords: {{2-3_related_terms}}
Target audience: {{who_is_searching_for_this}}
Content goal: {{rank_in_top_3 / build_email_list / drive_product_signups}}
Word count target: {{800 / 1500 / 2500+ words}}

Outline must include:
- **SEO title** (under 60 chars, keyword in first 30 chars) — provide 3 options
- **Meta description** (under 155 chars, includes keyword + CTA) — provide 2 options
- **URL slug** — clean, keyword-first
- **H1** — compelling, matches search intent
- **Introduction framework** — hook + problem + promise of value (no keyword stuffing)
- **Full H2/H3 structure** — with brief notes on what each section covers
- **Featured snippet target** — which H2 to optimise for position zero, with suggested answer format
- **Internal linking opportunities** — 3 placeholder spots with suggested anchor text
- **CTA placement** — where in the post to place the primary conversion action
- **FAQ section** — 4 questions from "People Also Ask" for this keyword`,
    category: 'Marketing',
    tags: ['seo', 'content', 'blogging', 'marketing'],
    author: { name: 'ContentOS', avatar: 'CO', verified: true },
    price: 2.99,
    downloads: 6890,
    rating: 4.4,
    ratingCount: 118,
    quality_score: 86,
  },
  {
    id: 'm11',
    title: 'Therapist-Style Reflective Journal Prompt',
    description: 'Evidence-based journaling prompts drawn from CBT and ACT therapy frameworks to help process emotions and build self-awareness.',
    body: `You are an experienced therapist trained in Cognitive Behavioural Therapy (CBT) and Acceptance and Commitment Therapy (ACT). Guide a reflective journaling session for the following situation.

What I want to explore: {{situation_emotion_or_pattern}}
What I already know about it: {{any_existing_thoughts}}
What I'm hoping to understand better: {{goal_for_this_session}}

Guide me through a 20-minute reflective journaling session with:

**1. Opening — Ground & Centre** (2 min)
Provide one grounding prompt to settle into the reflection.

**2. Observation without judgement** (5 min)
3 prompts that help me describe the situation or feeling factually, without evaluation.

**3. Exploring the belief** (5 min)
3 prompts that surface the underlying belief or assumption driving this feeling (CBT cognitive restructuring style).

**4. Alternative perspectives** (5 min)
2 prompts that gently challenge the belief and explore alternative interpretations.

**5. Values & action** (3 min)
1 ACT-style prompt: "What would the version of me who acted from my values do here?"

End with one affirmation that is honest, not toxic-positive.`,
    category: 'General',
    tags: ['journaling', 'mental-health', 'therapy', 'self-reflection'],
    author: { name: 'MindfulAI', avatar: 'MA', verified: false },
    price: 0,
    downloads: 12400,
    rating: 4.9,
    ratingCount: 287,
    quality_score: 90,
    trending: true,
  },
  {
    id: 'm12',
    title: 'UI/UX Design Critic & Improver',
    description: 'Evaluates any UI design description or screenshot against usability heuristics and provides specific, actionable improvements.',
    body: `You are a senior UX designer with a background in HCI research and product design at top tech companies. Evaluate and improve the following UI/UX design.

Design description / screenshot: {{describe_the_design_or_paste_screenshot}}
Product type: {{web_app / mobile_app / landing_page / dashboard}}
Primary user goal: {{what_the_user_is_trying_to_accomplish}}
User mental model: {{what_the_user_already_expects_from_similar_products}}

Evaluate against Nielsen's 10 Usability Heuristics — for each relevant one:
✅ Pass / ⚠️ Partial / ❌ Fail — with one specific observation

Then provide structured improvement recommendations:

**Critical Fixes** (block users from completing their goal)
**High Impact** (cause confusion or frustration but users work around it)
**Polish** (nice-to-have improvements)

For each recommendation:
- Current state: what is it doing now
- Problem: why it fails the user
- Fix: the specific change to make (be design-spec precise)
- Example: reference a product that does this well

End with: a priority-ordered checklist of the top 5 changes to implement first.`,
    category: 'Creative',
    tags: ['ux', 'design', 'usability', 'product'],
    author: { name: 'DesignSystems', avatar: 'DS', verified: true },
    price: 4.99,
    downloads: 4100,
    rating: 4.7,
    ratingCount: 55,
    quality_score: 91,
    new: true,
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Coding', 'Marketing', 'Business', 'Creative', 'Education', 'Analysis', 'Research', 'General'];

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'new', label: 'Newest' },
  { value: 'top', label: 'Top Rated' },
  { value: 'downloads', label: 'Most Downloaded' },
  { value: 'free', label: 'Free Only' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Coding:    'bg-blue-50 text-blue-600 border-blue-100',
  Marketing: 'bg-pink-50 text-pink-600 border-pink-100',
  Business:  'bg-amber-50 text-amber-700 border-amber-100',
  Creative:  'bg-purple-50 text-purple-600 border-purple-100',
  Education: 'bg-green-50 text-green-700 border-green-100',
  Analysis:  'bg-cyan-50 text-cyan-700 border-cyan-100',
  Research:  'bg-indigo-50 text-indigo-600 border-indigo-100',
  General:   'bg-gray-50 text-gray-600 border-gray-200',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDownloads(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <StarSolid className="h-3.5 w-3.5 text-amber-400" />
      <span className="text-[12px] font-semibold text-gray-700">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400">({count})</span>
    </div>
  );
}

function AuthorAvatar({ author }: { author: MarketPrompt['author'] }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-600">
        {author.avatar}
      </div>
      <span className="text-[11px] text-gray-500">{author.name}</span>
      {author.verified && (
        <CheckIcon className="h-3 w-3 text-brand-500" aria-label="Verified creator" />
      )}
    </div>
  );
}

// ─── Prompt Preview Modal ─────────────────────────────────────────────────────

interface PreviewModalProps {
  prompt: MarketPrompt | null;
  onClose: () => void;
  onImport: (id: string) => void;
  imported: Set<string>;
}

function PreviewModal({ prompt, onClose, onImport, imported }: PreviewModalProps) {
  if (!prompt) return null;
  const isImported = imported.has(prompt.id);
  const isFree = prompt.price === 0;
  const catClass = CATEGORY_COLORS[prompt.category] ?? CATEGORY_COLORS['General'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl animate-in"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4 pr-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={clsx('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', catClass)}>
                  {prompt.category}
                </span>
                {prompt.trending && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-600">
                    <FireIcon className="h-3 w-3" /> Trending
                  </span>
                )}
                {prompt.new && (
                  <span className="rounded-full bg-brand-50 border border-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-600">New</span>
                )}
              </div>
              <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{prompt.title}</h2>
              <p className="text-[13px] text-gray-500 mt-1">{prompt.description}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <StarRating rating={prompt.rating} count={prompt.ratingCount} />
            <div className="flex items-center gap-1 text-[12px] text-gray-500">
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              {fmtDownloads(prompt.downloads)} imports
            </div>
            <div className="text-[12px] font-semibold text-green-600">
              Quality: {prompt.quality_score}/100
            </div>
            <AuthorAvatar author={prompt.author} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {prompt.tags.map(t => (
              <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500">#{t}</span>
            ))}
          </div>

          {/* Prompt body preview */}
          <div
            className="rounded-xl border p-4 mb-5"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Prompt Preview</p>
            {isFree ? (
              <pre className="whitespace-pre-wrap text-[12px] font-mono text-gray-700 leading-relaxed max-h-56 overflow-y-auto">
                {prompt.body}
              </pre>
            ) : (
              <div className="relative">
                <pre className="whitespace-pre-wrap text-[12px] font-mono text-gray-700 leading-relaxed max-h-28 overflow-hidden blur-[3px] select-none">
                  {prompt.body}
                </pre>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-white/80 rounded-xl">
                  <LockClosedIcon className="h-7 w-7 text-gray-400 mb-2" />
                  <p className="text-[13px] font-semibold text-gray-600">Purchase to unlock full prompt</p>
                  <p className="text-[12px] text-gray-400">One-time payment, use forever</p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <div>
              {isFree ? (
                <span className="text-[15px] font-bold text-green-600">Free</span>
              ) : (
                <span className="text-[20px] font-bold text-gray-900">${prompt.price.toFixed(2)}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border px-4 py-2 text-[13px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                Cancel
              </button>
              {isFree ? (
                <button
                  onClick={() => { onImport(prompt.id); onClose(); }}
                  disabled={isImported}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-all',
                    isImported
                      ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                      : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
                  )}
                >
                  {isImported ? (
                    <><CheckIcon className="h-4 w-4" /> Imported</>
                  ) : (
                    <><ArrowDownTrayIcon className="h-4 w-4" /> Import to Library</>
                  )}
                </button>
              ) : (
                <button
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-amber-600 shadow-sm transition-colors"
                  onClick={() => {
                    showToast.info('Payments coming soon — stay tuned!');
                    onClose();
                  }}
                >
                  Buy for ${prompt.price.toFixed(2)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────

interface PromptCardProps {
  prompt: MarketPrompt;
  onPreview: (p: MarketPrompt) => void;
  onImport: (id: string) => void;
  imported: Set<string>;
}

function PromptCard({ prompt, onPreview, onImport, imported }: PromptCardProps) {
  const isImported = imported.has(prompt.id);
  const isFree = prompt.price === 0;
  const catClass = CATEGORY_COLORS[prompt.category] ?? CATEGORY_COLORS['General'];

  return (
    <article
      className="group relative flex flex-col rounded-2xl border bg-white cursor-pointer transition-all duration-150 overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderColor: 'var(--color-border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#C4B5FD')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
      onClick={() => onPreview(prompt)}
    >
      {/* Top bar with category gradient */}
      <div className="h-1 w-full bg-gradient-to-r from-brand-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex flex-col flex-1 p-5">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-semibold', catClass)}>
            {prompt.category}
          </span>
          {prompt.trending && (
            <span className="flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
              <FireIcon className="h-2.5 w-2.5" /> Trending
            </span>
          )}
          {prompt.new && (
            <span className="rounded-full bg-brand-50 border border-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-500">New</span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-bold text-gray-900 leading-snug mb-1.5 group-hover:text-brand-600 transition-colors">
          {prompt.title}
        </h3>

        {/* Description */}
        <p className="text-[12px] text-gray-500 line-clamp-2 flex-1 mb-3">
          {prompt.description}
        </p>

        {/* Author */}
        <div className="mb-3">
          <AuthorAvatar author={prompt.author} />
        </div>

        {/* Stats footer */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <StarRating rating={prompt.rating} count={prompt.ratingCount} />
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <ArrowDownTrayIcon className="h-3 w-3" />
              {fmtDownloads(prompt.downloads)}
            </div>
          </div>

          {/* Price / Import */}
          <div onClick={e => e.stopPropagation()}>
            {isFree ? (
              <button
                onClick={() => onImport(prompt.id)}
                disabled={isImported}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
                  isImported
                    ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                    : 'bg-brand-600 text-white hover:bg-brand-700',
                )}
              >
                {isImported ? '✓ Imported' : 'Import Free'}
              </button>
            ) : (
              <button
                onClick={() => {
                  showToast.info('Payments coming soon!');
                }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                ${prompt.price.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Hero / Stats Banner ──────────────────────────────────────────────────────

function HeroBanner({ search, onSearch }: { search: string; onSearch: (v: string) => void }) {
  const total = MOCK_PROMPTS.length;
  const freeCount = MOCK_PROMPTS.filter(p => p.price === 0).length;
  const totalDownloads = MOCK_PROMPTS.reduce((s, p) => s + p.downloads, 0);

  return (
    <div className="relative overflow-hidden border-b" style={{ borderColor: 'var(--color-border)' }}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600/8 via-violet-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />

      <div className="relative px-8 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GlobeAltIcon className="h-5 w-5 text-brand-500" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand-500">Global Marketplace</span>
            </div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-gray-900 leading-tight">
              Explore the World's Best Prompts
            </h1>
            <p className="text-[14px] text-gray-500 mt-1 max-w-lg">
              Community-crafted, expert-reviewed. Import any prompt into your library in one click.
            </p>
          </div>

          {/* Stats */}
          <div className="hidden lg:flex gap-6 text-right shrink-0">
            {[
              { label: 'Prompts', value: `${total}+` },
              { label: 'Free', value: `${freeCount}` },
              { label: 'Downloads', value: `${fmtDownloads(totalDownloads)}+` },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[20px] font-extrabold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-xl">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search prompts, categories, use cases…"
            className="w-full rounded-2xl border bg-white/80 backdrop-blur py-3.5 pl-12 pr-4 text-[14px] text-gray-800 placeholder-gray-400 shadow-sm transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            style={{ borderColor: 'var(--color-border-strong)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Featured Row ─────────────────────────────────────────────────────────────

function FeaturedRow({
  prompts,
  onPreview,
  onImport,
  imported,
}: {
  prompts: MarketPrompt[];
  onPreview: (p: MarketPrompt) => void;
  onImport: (id: string) => void;
  imported: Set<string>;
}) {
  if (prompts.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="h-4 w-4 text-brand-500" />
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-500">Featured</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {prompts.map(p => (
          <PromptCard key={p.id} prompt={p} onPreview={onPreview} onImport={onImport} imported={imported} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('trending');
  const [previewPrompt, setPreviewPrompt] = useState<MarketPrompt | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());

  const handleImport = (id: string) => {
    if (imported.has(id)) return;
    setImported(prev => new Set([...prev, id]));
    const p = MOCK_PROMPTS.find(x => x.id === id);
    showToast.success(`"${p?.title}" added to your Library!`);
  };

  const filtered = useMemo(() => {
    let list = [...MOCK_PROMPTS];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)) ||
        p.category.toLowerCase().includes(q),
      );
    }

    if (category !== 'All') {
      list = list.filter(p => p.category === category);
    }

    if (sort === 'free') list = list.filter(p => p.price === 0);
    else if (sort === 'new') list = list.filter(p => p.new).concat(list.filter(p => !p.new));
    else if (sort === 'trending') list = list.filter(p => p.trending).concat(list.filter(p => !p.trending));
    else if (sort === 'top') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === 'downloads') list = [...list].sort((a, b) => b.downloads - a.downloads);

    return list;
  }, [search, category, sort]);

  const featured = useMemo(
    () => (search || category !== 'All' ? [] : MOCK_PROMPTS.filter(p => p.featured)),
    [search, category],
  );

  const showFeatured = featured.length > 0 && sort === 'trending';

  return (
    <>
      <div className="flex h-full flex-col">
        <HeroBanner search={search} onSearch={setSearch} />

        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
          <div className="px-8 py-6">

            {/* Filters row */}
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={clsx(
                      'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all',
                      category === cat
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white border text-gray-500 hover:border-brand-300 hover:text-brand-600',
                    )}
                    style={category !== cat ? { borderColor: 'var(--color-border)' } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex gap-1 rounded-xl border bg-white p-1" style={{ borderColor: 'var(--color-border)' }}>
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setSort(o.value)}
                    className={clsx(
                      'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all',
                      sort === o.value
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured section */}
            {showFeatured && (
              <FeaturedRow
                prompts={featured}
                onPreview={setPreviewPrompt}
                onImport={handleImport}
                imported={imported}
              />
            )}

            {/* All results section */}
            {(!showFeatured || filtered.some(p => !p.featured)) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {showFeatured && (
                      <>
                        <ChevronRightIcon className="h-4 w-4 text-gray-300" />
                        <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-500">All Prompts</h2>
                      </>
                    )}
                    <span className="text-[12px] text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                      <MagnifyingGlassIcon className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-[15px] font-semibold text-gray-700">No prompts found</p>
                    <p className="text-[13px] text-gray-400 mt-1">Try a different search or category.</p>
                    <button
                      onClick={() => { setSearch(''); setCategory('All'); setSort('trending'); }}
                      className="mt-4 text-[13px] font-medium text-brand-600 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {(showFeatured ? filtered.filter(p => !p.featured) : filtered).map(p => (
                      <PromptCard
                        key={p.id}
                        prompt={p}
                        onPreview={setPreviewPrompt}
                        onImport={handleImport}
                        imported={imported}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Coming soon banner */}
            <div
              className="mt-10 rounded-2xl border p-6 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <p className="text-[14px] font-bold text-gray-900">Want to sell your prompts?</p>
                <p className="text-[13px] text-gray-500 mt-0.5">Creator monetisation & paid listings are coming soon.</p>
              </div>
              <button
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
                onClick={() => showToast.info('Creator program launching soon — stay tuned!')}
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        prompt={previewPrompt}
        onClose={() => setPreviewPrompt(null)}
        onImport={handleImport}
        imported={imported}
      />
    </>
  );
}
