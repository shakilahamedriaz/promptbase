"""
Seed script for marketplace — creates users, published prompts, and ratings.
Run from the backend directory:
    python seed_marketplace.py
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:promptvault_dev@localhost:5432/promptvault"

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_async_engine(DATABASE_URL, echo=False)
SessionFactory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

def now_utc():
    return datetime.now(timezone.utc)

def days_ago(n):
    return now_utc() - timedelta(days=n)

# ─── Content Creators ─────────────────────────────────────────────────────────

CREATORS = [
    {"email": "sarah@promptvault.pro", "name": "Sarah Chen", "password": "demo1234"},
    {"email": "james@promptvault.pro", "name": "James Wilson", "password": "demo1234"},
    {"email": "emma@promptvault.pro", "name": "Emma Rodriguez", "password": "demo1234"},
    {"email": "alex@promptvault.pro", "name": "Alex Kim", "password": "demo1234"},
    {"email": "lisa@promptvault.pro", "name": "Lisa Thompson", "password": "demo1234"},
]

# ─── Published Prompts (Marketplace Data) ─────────────────────────────────────

PUBLISHED_PROMPTS = [
    {
        "title": "Senior Code Reviewer",
        "description": "Get expert code review feedback from a principal engineer perspective, covering security, architecture, and best practices.",
        "category": "Coding",
        "tags": ["code-review", "engineering", "security"],
        "quality_score": 94,
        "use_count": 142,
        "body": """You are a senior software engineer with 15+ years in production systems.
Review the following code with the eye of a principal engineer doing a pre-merge review.

For each issue provide:
1. Severity (Critical / High / Medium / Low)
2. Location (file + line if known)
3. Problem — what is wrong and why it matters
4. Fix — corrected code or concrete suggestion

After the list:
- Summary score (1–10) with one-sentence justification
- Top 3 things done well
- Single most important change before merging

Code: {{paste_code_here}}

Assume production with 10k+ daily users.""",
        "ratings": [5, 5, 5, 4, 5, 5, 4, 4, 5],
        "creator_idx": 0,
    },
    {
        "title": "Viral LinkedIn Post Generator",
        "description": "Create authentic, scroll-stopping LinkedIn posts that drive engagement and build your personal brand.",
        "category": "Marketing",
        "tags": ["linkedin", "social-media", "personal-brand"],
        "quality_score": 88,
        "use_count": 98,
        "body": """You are a top LinkedIn content strategist who has helped executives grow to 100k+ followers.
Write a LinkedIn post about the following that feels authentic, not salesy.

Topic: {{topic_or_story}}
My background: {{role_and_industry}}
Goal: {{awareness / leads / thought_leadership}}

Structure:
- Hook (first line — must stop the scroll)
- Body (3–5 short paragraphs, max 3 lines each)
- Insight or lesson (the "so what")
- CTA (one clear ask)

Tone: conversational but authoritative. No jargon. No "I'm thrilled to announce."
Length: 150–250 words.""",
        "ratings": [5, 5, 4, 5, 5],
        "creator_idx": 1,
    },
    {
        "title": "Cold Email That Gets Replies",
        "description": "Write high-converting cold emails with proven SDR techniques for 40%+ reply rates.",
        "category": "Business",
        "tags": ["sales", "email", "outreach", "copywriting"],
        "quality_score": 92,
        "use_count": 156,
        "body": """You are a top-performing SDR with consistently 40%+ reply rates.
Write a cold email for this scenario.

Prospect: {{name}}, {{title}} at {{company}}
Their likely pain: {{pain_point}}
What I offer: {{product_one_line}}
My company: {{your_company}}
Personal hook: {{research_or_connection}}

Rules:
- Subject: under 8 words, no "Quick question" or "Following up"
- Open with the personal hook (1 sentence)
- Name their pain, not your features (1–2 sentences)
- One specific quantified proof point (1 sentence)
- CTA: one low-friction ask
- Total: under 100 words. No bullet points.""",
        "ratings": [5, 5, 5, 5, 4, 5, 5],
        "creator_idx": 2,
    },
    {
        "title": "SEO Blog Post Writer",
        "description": "Generate SEO-optimized blog posts that rank on Google with proper keyword targeting and high readability.",
        "category": "Writing",
        "tags": ["seo", "blog", "content", "writing"],
        "quality_score": 87,
        "use_count": 67,
        "body": """You are an expert SEO content strategist and writer.

Topic: {{blog_topic}}
Target keyword: {{primary_keyword}}
Secondary keywords: {{secondary_keywords}}
Target audience: {{audience_description}}
Desired length: {{word_count}} words

Write a fully optimised blog post including:
- SEO-optimised title (under 60 characters)
- Meta description (under 155 characters)
- H2 and H3 subheadings naturally incorporating keywords
- Introduction that hooks with a question or stat
- Body with actionable advice, examples, and data points
- Conclusion with a clear CTA
- Readability: aim for Flesch score 60+""",
        "ratings": [4, 4, 5, 4, 4, 4],
        "creator_idx": 3,
    },
    {
        "title": "UX/UI Design Critique",
        "description": "Get expert feedback on your design's hierarchy, accessibility, cognitive load, and conversion path.",
        "category": "Analysis",
        "tags": ["ux", "design", "critique", "product"],
        "quality_score": 89,
        "use_count": 43,
        "body": """You are a senior UX designer with a background in HCI research at top tech companies.

Design to evaluate: {{description_or_screenshot_url}}
Product type: {{web_app / mobile_app / landing_page}}
Target user: {{user_persona}}

Evaluate across:
1. Visual hierarchy — does the eye land where it should?
2. Cognitive load — how many decisions must the user make?
3. Accessibility — contrast, touch targets, screen reader support
4. Conversion path — is the primary CTA obvious?
5. Consistency — does it follow established patterns?

For each area: score /10, key issue, specific fix.
End with the single highest-leverage change to make today.""",
        "ratings": [5, 4, 5, 5],
        "creator_idx": 4,
    },
    {
        "title": "Python Debugging Assistant",
        "description": "Get expert Python debugging help with root cause analysis, error explanations, and prevention strategies.",
        "category": "Coding",
        "tags": ["python", "debugging", "errors"],
        "quality_score": 90,
        "use_count": 124,
        "body": """You are an expert Python developer and debugger.

Error message: {{paste_error}}
Code context: {{paste_relevant_code}}
What I was trying to do: {{intended_behaviour}}
Python version: {{version}}
Libraries involved: {{libraries}}

Diagnose:
1. Root cause — exactly what went wrong and why
2. Line-by-line explanation of the error traceback
3. Fix — corrected code snippet
4. Prevention — how to avoid this class of bug in future
5. If relevant: suggest a better approach entirely""",
        "ratings": [5, 5, 4, 5, 5, 5, 5, 5],
        "creator_idx": 0,
    },
    {
        "title": "Startup Pitch Deck Narrator",
        "description": "Get VC-backed compelling narratives for each pitch deck slide written by an experienced investor.",
        "category": "Business",
        "tags": ["startup", "pitch", "fundraising", "investor"],
        "quality_score": 93,
        "use_count": 87,
        "body": """You are a former VC partner who has reviewed 3,000+ pitch decks and helped 50+ startups raise seed to Series B.

Startup: {{company_name}}
Product: {{what_it_does_in_one_sentence}}
Stage: {{pre-seed / seed / Series_A}}
Traction: {{key_metrics}}
Ask: {{amount}} for {{what_you'll_do_with_it}}
Competitive landscape: {{main_competitors}}

Write a compelling narrative for each pitch deck slide:
1. Problem (make them feel the pain)
2. Solution (show the magic)
3. Market size (TAM/SAM/SOM with sourced numbers)
4. Business model (clear revenue mechanics)
5. Traction (let the numbers speak)
6. Team (why you, why now)
7. Ask (specific, credible use of funds)

Keep each slide to 3 sentences max. Investors see 1,000 decks a year — every word must earn its place.""",
        "ratings": [5, 5, 5, 5, 5, 5],
        "creator_idx": 1,
    },
    {
        "title": "Mental Model Explainer",
        "description": "Learn complex concepts through layered explanations, analogies, and practical exercises.",
        "category": "Education",
        "tags": ["learning", "mental-models", "thinking"],
        "quality_score": 88,
        "use_count": 54,
        "body": """You are a master teacher who specialises in making complex ideas simple and memorable.

Concept to explain: {{concept_or_mental_model}}
My background: {{what_i_already_know}}
How I'll use this: {{practical_application}}

Explain in layers:
1. The 5-year-old version (1 analogy, max 3 sentences)
2. The complete explanation (clear, jargon-free, with a concrete example)
3. Where it breaks down (edge cases and failure modes)
4. How it connects to: {{related_concept_1}} and {{related_concept_2}}
5. One exercise to make it stick

End with a memorable one-liner that captures the essence.""",
        "ratings": [5, 4, 5, 5, 4],
        "creator_idx": 2,
    },
    {
        "title": "Data Analysis Interpreter",
        "description": "Transform raw data into actionable business insights with anomaly detection and recommendations.",
        "category": "Analysis",
        "tags": ["data", "analysis", "insights", "statistics"],
        "quality_score": 86,
        "use_count": 62,
        "body": """You are a data scientist and business analyst who translates raw numbers into clear insights.

Dataset / results: {{paste_data_or_summary}}
Business context: {{what_this_data_is_about}}
Audience: {{who_will_read_this_analysis}}
Key question to answer: {{primary_question}}

Provide:
1. Key findings (top 3–5 insights, ranked by business impact)
2. Anomalies or surprises worth investigating
3. Recommended actions based on the data
4. Limitations — what the data cannot tell us
5. Suggested next analysis to run

Use plain language. If a number matters, say why.""",
        "ratings": [4, 4, 5, 4, 4],
        "creator_idx": 3,
    },
    {
        "title": "API Documentation Writer",
        "description": "Create comprehensive API documentation with request/response examples and error handling guides.",
        "category": "Coding",
        "tags": ["api", "documentation", "developer"],
        "quality_score": 85,
        "use_count": 41,
        "body": """You are a technical writer specialising in developer documentation for REST APIs.

API endpoint: {{method}} {{endpoint_path}}
What it does: {{description}}
Request parameters: {{params}}
Request body: {{schema}}
Response: {{response_schema}}
Authentication: {{auth_method}}
Error codes: {{error_list}}

Write complete documentation including:
1. Endpoint overview (1 paragraph)
2. Request parameters table (name, type, required, description)
3. Request body example (realistic JSON)
4. Response examples (success + 2 error cases)
5. Code samples in: curl, Python, JavaScript
6. Common gotchas or rate limits""",
        "ratings": [4, 4, 4, 4, 3],
        "creator_idx": 4,
    },
]

# ─── Main Seed Function ───────────────────────────────────────────────────────

async def seed_marketplace():
    async with SessionFactory() as db:
        print("\n[*] Seeding Marketplace Data...\n")

        # Create/get creator users
        creator_ids = []
        for creator in CREATORS:
            result = await db.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": creator["email"]},
            )
            row = result.fetchone()

            if row:
                creator_ids.append(row[0])
                print(f"[OK] Creator exists: {creator['name']}")
            else:
                user_id = uuid4()
                creator_ids.append(user_id)
                await db.execute(
                    text("""
                        INSERT INTO users (id, email, password_hash, display_name, plan, auth_provider)
                        VALUES (:id, :email, :pw, :name, 'pro', 'email')
                    """),
                    {
                        "id": user_id,
                        "email": creator["email"],
                        "pw": _pwd.hash(creator["password"]),
                        "name": creator["name"],
                    },
                )
                print(f"[OK] Created creator: {creator['name']}")

        await db.commit()

        # Create published prompts
        for i, prompt_data in enumerate(PUBLISHED_PROMPTS):
            creator_id = creator_ids[prompt_data["creator_idx"]]
            prompt_id = uuid4()

            created = days_ago(random.randint(10, 60))
            updated = created + timedelta(days=random.randint(0, 3))

            await db.execute(
                text("""
                    INSERT INTO prompts
                        (id, user_id, title, body, description, category, tags, is_favorite, use_count, quality_score, is_public, created_at, updated_at)
                    VALUES
                        (:id, :uid, :title, :body, :desc, :cat, :tags, :fav, :uses, :score, :public, :created, :updated)
                """),
                {
                    "id": prompt_id,
                    "uid": creator_id,
                    "title": prompt_data["title"],
                    "body": prompt_data["body"],
                    "desc": prompt_data.get("description"),
                    "cat": prompt_data["category"],
                    "tags": prompt_data["tags"],
                    "fav": random.choice([True, False]),
                    "uses": prompt_data["use_count"],
                    "score": prompt_data["quality_score"],
                    "public": True,  # All are published for marketplace
                    "created": created,
                    "updated": updated,
                },
            )

            # Add ratings
            for rating_score in prompt_data["ratings"]:
                # Random rating user (pick from any creator)
                rating_user_id = random.choice(creator_ids)

                # Skip if same creator
                if rating_user_id == creator_id:
                    rating_user_id = random.choice([c for c in creator_ids if c != creator_id])

                await db.execute(
                    text("""
                        INSERT INTO prompt_ratings (id, prompt_id, user_id, score, created_at)
                        VALUES (:id, :pid, :uid, :score, :created)
                        ON CONFLICT (prompt_id, user_id) DO UPDATE SET score = :score
                    """),
                    {
                        "id": uuid4(),
                        "pid": prompt_id,
                        "uid": rating_user_id,
                        "score": rating_score,
                        "created": days_ago(random.randint(0, 30)),
                    },
                )

            print(f"[OK] Published: {prompt_data['title']} ({len(prompt_data['ratings'])} ratings)")

        await db.commit()
        print("\n[DONE] Marketplace seeded successfully!\n")
        print("[INFO] You can now:")
        print("   1. Login with any creator account (see above)")
        print("   2. Go to Library -> See prompts marked as published")
        print("   3. Go to Explore -> Browse all marketplace prompts")
        print("   4. Rate prompts with stars")
        print("   5. Import prompts to your library\n")


if __name__ == "__main__":
    asyncio.run(seed_marketplace())
