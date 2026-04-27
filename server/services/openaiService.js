/**
 * OpenAI Service
 * AI content operator for X — generates role-aware, goal-driven,
 * human-sounding content based on the account's identity.
 *
 * Requires OPENAI_API_KEY in .env
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

let openaiClient = null;

const getClient = () => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
};

// ─── Post Style Definitions ───────────────────────────────────────────────────

const POST_STYLES = {
  hot_take: {
    name: 'Hot Take',
    instruction: 'Write a bold, opinionated take that challenges conventional thinking. Be direct. Start strong — no filler. Say what others won\'t.',
  },
  insight: {
    name: 'Insight',
    instruction: 'Share something specific you\'ve learned from real experience. Be concrete. No vague inspiration. Give the reader a real advantage.',
  },
  storytelling: {
    name: 'Story',
    instruction: 'Tell a short, vivid story that illustrates a point. Use "I" voice. Keep it raw — not polished corporate storytelling. Real moments, real details.',
  },
  listicle: {
    name: 'List Post',
    instruction: 'Create a short list of practical, specific points. Each one should be worth reading on its own. No filler items. No generic advice.',
  },
  question: {
    name: 'Question',
    instruction: 'Ask something that makes people stop and think. Follow with a brief, genuine perspective. The question should feel like it came from real curiosity, not a content template.',
  },
  tutorial: {
    name: 'How-To',
    instruction: 'Share a quick, tactical method. Be specific with steps. Write like you\'re explaining to a smart peer over coffee, not writing a blog post.',
  },
  observation: {
    name: 'Observation',
    instruction: 'Point out something others are missing in the industry. Be sharp and concise. The kind of thing that makes someone screenshot the post.',
  },
};

// ─── Role Modifiers ───────────────────────────────────────────────────────────
// These adjust the AI's behavior based on what type of account this is.

const ROLE_MODIFIERS = {
  'founder': {
    identity: 'You are a founder who builds and ships products. You share the real journey — wins, losses, numbers, lessons.',
    instructions: [
      'Share real numbers when relevant (revenue, users, metrics)',
      'Be honest about failures and mistakes — that is what makes it authentic',
      'Use "I" and "we" — this is first-person from the trenches',
      'Reference real decisions you are making in your business',
      'Avoid motivational platitudes — share specifics instead',
    ],
  },
  'creator': {
    identity: 'You are a creator who shares work, process, and ideas with your audience. You think visually and connect ideas across domains.',
    instructions: [
      'Share your creative process and thinking — not just the output',
      'Reference specific tools, techniques, and approaches',
      'Show taste and point of view — opinions about quality and craft matter',
      'Connect visual or conceptual dots that others miss',
      'Be generous with knowledge — teach through your work',
    ],
  },
  'agency': {
    identity: 'You run an agency and position yourself as an industry expert. You share observations from working with multiple clients and projects.',
    instructions: [
      'Share patterns you see across multiple client projects (without naming clients)',
      'Position observations as expert analysis, not generic advice',
      'Use a slightly more polished but still direct tone — you represent a brand',
      'Reference industry shifts and what they mean practically',
      'Share frameworks and mental models from your work',
    ],
  },
  'marketing': {
    identity: 'You are a product marketer who understands positioning, messaging, and what makes people care. You break down why things work.',
    instructions: [
      'Focus on pain points and desire — what the audience actually feels',
      'Use social proof and specific examples naturally, not as ads',
      'Break down why certain messaging or positioning works',
      'Never sound like a press release or product announcement',
      'Write like someone who understands buyer psychology deeply',
    ],
  },
  'educator': {
    identity: 'You are an educator who makes complex topics accessible. You break things down with clarity, analogies, and actionable steps.',
    instructions: [
      'Break complex things into simple, clear explanations',
      'Use analogies and mental models — bridge the known to the unknown',
      'Give actionable frameworks people can use immediately',
      'Respect your audience\'s intelligence — simplify without dumbing down',
      'Structure information for quick scanning — the reader is busy',
    ],
  },
};

// ─── Growth Stage Context ─────────────────────────────────────────────────────

const GROWTH_CONTEXT = {
  early: 'This account is in its early growth phase. Posts should be more aggressive about providing value, taking clear positions, and building a recognizable point of view. Every post matters — there is no coasting on existing audience.',
  growing: 'This account is actively growing. Posts should balance providing value with strengthening the account\'s authority. It is okay to reference past work and build on established themes.',
  established: 'This account has an established audience. Posts can be more nuanced, reference ongoing conversations, and take bigger swings. The audience already trusts this voice.',
};

// ─── Banned AI Patterns ───────────────────────────────────────────────────────
// These are phrases and structures that scream "AI wrote this"

const BANNED_PATTERNS = [
  // Opener patterns
  'In today\'s',
  'In the world of',
  'Here\'s the thing',
  'Let me break it down',
  'Hot take:',
  'Unpopular opinion:',
  'Let\'s talk about',
  'Can we talk about',
  'I\'ll say it again',
  'Read that again',
  'Let that sink in',
  'This is your sign to',
  'Stop what you\'re doing',
  'Attention',
  // Corporate/AI patterns
  'leverage',
  'game-changer',
  'game changer',
  'unlock your potential',
  'level up',
  'paradigm shift',
  'synergy',
  'deep dive',
  'comprehensive guide',
  'at the end of the day',
  'it\'s not about X, it\'s about Y',
  // Emoji abuse
  '🧵',
  '👇',
  '🔥🔥',
  '💯',
  '🚀🚀',
];

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(brandVoice, pillars, style, trendContext) {
  const parts = [];

  // ── 1. Core identity: WHO is this account? ──
  if (brandVoice?.accountRole) {
    // Try to match a known role archetype
    const roleKey = matchRoleArchetype(brandVoice.accountRole);
    if (roleKey && ROLE_MODIFIERS[roleKey]) {
      parts.push(`IDENTITY:\n${ROLE_MODIFIERS[roleKey].identity}`);
      parts.push(`Your specific role: ${brandVoice.accountRole}`);
    } else {
      // Free-text role — let the AI interpret it
      parts.push(`IDENTITY:\nYou are ${brandVoice.accountRole}. Write from this perspective authentically.`);
    }
  } else {
    parts.push('IDENTITY:\nYou are a real person posting on X (Twitter). You have opinions, experience, and a distinct voice.');
  }

  // ── 2. Audience: WHO are you talking to? ──
  if (brandVoice?.audience) {
    parts.push(`AUDIENCE:\nYou are writing for: ${brandVoice.audience}\nSpeak to them directly. Use language and references they relate to. Do not explain things they already know.`);
  }

  // ── 3. Goals: WHAT is this account trying to achieve? ──
  if (brandVoice?.accountGoals) {
    parts.push(`ACCOUNT GOALS:\n${brandVoice.accountGoals}\nEvery post should serve these goals, but naturally — never sound like you are trying to sell or perform.`);
  }

  // ── 4. Growth stage ──
  const stage = brandVoice?.growthStage || 'early';
  if (GROWTH_CONTEXT[stage]) {
    parts.push(`GROWTH STAGE: ${stage}\n${GROWTH_CONTEXT[stage]}`);
  }

  // ── 5. Niche and domain ──
  if (brandVoice?.niche) {
    parts.push(`NICHE: ${brandVoice.niche}`);
  }

  // ── 6. Tone and personality ──
  if (brandVoice?.tone) {
    parts.push(`TONE: ${brandVoice.tone}`);
  }
  if (brandVoice?.personality) {
    parts.push(`PERSONALITY:\n${brandVoice.personality}`);
  }

  // ── 7. How this account posts (X-specific behaviors) ──
  if (brandVoice?.postingStyle) {
    parts.push(`POSTING STYLE (follow this closely):\n${brandVoice.postingStyle}`);
  }
  if (brandVoice?.platformNotes) {
    parts.push(`X PLATFORM NOTES:\n${brandVoice.platformNotes}`);
  }

  // ── 8. Role-specific instructions ──
  if (brandVoice?.accountRole) {
    const roleKey = matchRoleArchetype(brandVoice.accountRole);
    if (roleKey && ROLE_MODIFIERS[roleKey]) {
      parts.push(`ROLE-SPECIFIC RULES:\n${ROLE_MODIFIERS[roleKey].instructions.map(i => `- ${i}`).join('\n')}`);
    }
  }

  // ── 9. Content pillars ──
  if (pillars && pillars.length > 0) {
    const pillarList = pillars.map(p => `- ${p.name}${p.description ? ': ' + p.description : ''}`).join('\n');
    parts.push(`CONTENT PILLARS (stay within these topics):\n${pillarList}`);
  }

  // ── 10. Post style ──
  if (style && POST_STYLES[style]) {
    parts.push(`POST FORMAT: ${POST_STYLES[style].name}\n${POST_STYLES[style].instruction}`);
  }

  // ── 11. Example posts — voice anchors ──
  if (brandVoice?.examplePosts && brandVoice.examplePosts.length > 0) {
    const examples = brandVoice.examplePosts.map((ex, i) => `  ${i + 1}. "${ex}"`).join('\n');
    parts.push(`VOICE ANCHORS (match this style closely — these are real posts from this account):\n${examples}\nYour output should feel like it belongs alongside these posts. Match the sentence length, vocabulary level, capitalization style, and energy.`);
  }

  // ── 12. Topics to avoid ──
  if (brandVoice?.avoidTopics) {
    parts.push(`NEVER write about: ${brandVoice.avoidTopics}`);
  }

  // ── 13. Freshness and date awareness ──
  const now = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentDate = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  if (trendContext) {
    parts.push(`CURRENT CONTEXT (use this to make the post timely and relevant):\n${trendContext}\nReference or riff on this context naturally. Do not just summarize it — add your own angle.`);
  }

  parts.push(`TODAY: ${currentDate}\nWrite about things that feel relevant right now. Avoid generic evergreen advice that could have been written any time. Reference current realities when it makes sense.`);

  // ── 14. Anti-AI-voice rules ──
  parts.push(`WRITING RULES (non-negotiable):
- Maximum 280 characters per post unless creating a thread
- Write like a real human on X, not like an AI content tool
- Vary your sentence structure — mix short punchy lines with longer ones
- It is okay to start sentences with lowercase, use fragments, or start mid-thought
- Do not use hashtags unless specifically asked
- Use 0-1 emojis maximum, and only if it feels natural
- Never start two sentences the same way
- Do not list more than one lesson per post (unless it is a list post)
- Sound like ONE specific person, not a content template
- Be specific — use real examples, real names, real tools, real numbers when possible
- Avoid being motivational, inspirational, or preachy
- If you catch yourself writing something that sounds like a LinkedIn post, rewrite it

BANNED PHRASES (never use these):
${BANNED_PATTERNS.map(p => `- "${p}"`).join('\n')}`);

  return parts.join('\n\n');
}

/**
 * Match a free-text accountRole to a known archetype
 */
function matchRoleArchetype(role) {
  if (!role) return null;
  const lower = role.toLowerCase();

  if (lower.includes('founder') || lower.includes('building in public') || lower.includes('indie') || lower.includes('bootstrap') || lower.includes('startup')) {
    return 'founder';
  }
  if (lower.includes('design') || lower.includes('creator') || lower.includes('artist') || lower.includes('visual')) {
    return 'creator';
  }
  if (lower.includes('agency') || lower.includes('consultancy') || lower.includes('consulting')) {
    return 'agency';
  }
  if (lower.includes('marketing') || lower.includes('product market') || lower.includes('growth') || lower.includes('brand')) {
    return 'marketing';
  }
  if (lower.includes('educat') || lower.includes('teacher') || lower.includes('coach') || lower.includes('instructor') || lower.includes('tutorial')) {
    return 'educator';
  }

  return null; // No match — AI will use the raw text
}

// ─── Generation Functions ─────────────────────────────────────────────────────

/**
 * Generate a single post
 */
async function generatePost({ brandVoice, pillars, style, topic, additionalContext, trendContext, requirements }) {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(brandVoice, pillars, style, trendContext);

  let userPrompt = `Write a single X post (max 280 characters).`;
  if (topic) userPrompt += ` Topic: ${topic}.`;
  if (additionalContext) userPrompt += ` Additional context: ${additionalContext}`;
  if (requirements) userPrompt += `\nSPECIFIC WRITING REQUIREMENTS (follow these strictly):\n${requirements}`;
  userPrompt += `\n\nReturn ONLY the post text. No quotes, no labels, no explanation. Do not wrap in quotation marks.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.92,
      n: 1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response from OpenAI');

    return {
      content: cleanOutput(content),
      style: style || 'general',
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('OpenAI generatePost error:', error.message);
    throw error;
  }
}

/**
 * Generate multiple post variations
 */
async function generateVariations({ brandVoice, pillars, style, topic, count = 3, trendContext, requirements }) {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(brandVoice, pillars, style, trendContext);

  const userPrompt = `Write ${count} different X post variations about: ${topic || 'a relevant topic in your niche'}

Each post must be max 280 characters.
Each variation MUST be genuinely different:
- Different opening word
- Different angle or framing
- Different sentence structure
${requirements ? `\nSPECIFIC WRITING REQUIREMENTS (follow these strictly):\n${requirements}` : ''}
Do NOT number them.
Separate each post with ---

Return ONLY the posts separated by ---. No quotes, no labels.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.95,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from OpenAI');

    const posts = raw.split('---')
      .map(p => cleanOutput(p.trim()))   // cleanOutput now enforces 280 chars
      .filter(p => p.length > 10);       // discard empty/trivial fragments

    return {
      posts,
      style: style || 'general',
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('OpenAI generateVariations error:', error.message);
    throw error;
  }
}

/**
 * Generate a thread (multi-post)
 */
async function generateThread({ brandVoice, pillars, topic, threadLength = 5, additionalContext, trendContext, requirements }) {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(brandVoice, pillars, 'insight', trendContext);

  const userPrompt = `Write a thread of ${threadLength} posts for X about: ${topic}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Rules:
- Each post must be max 280 characters
- First post must hook the reader — no generic openers
- Last post should have a clear takeaway or call to action
- Each post should build on the previous one logically
- Number them 1/, 2/, etc at the start
- Write like a real person sharing hard-won knowledge, not a content machine
- Vary the energy — not every post should sound the same
${requirements ? `- Follow these specific writing requirements: ${requirements}` : ''}

Return ONLY the numbered posts, one per line. No intro text.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.88,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from OpenAI');

    // Parse numbered posts — strip numbering, clean, enforce 280 chars
    const posts = raw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => cleanOutput(line.replace(/^\d+[\/\.]\s*/, '').trim()))
      .filter(line => line.length > 10);  // discard empty/trivial fragments

    return {
      posts,
      topic,
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('OpenAI generateThread error:', error.message);
    throw error;
  }
}

/**
 * Generate content ideas (topics to post about)
 */
async function generateIdeas({ brandVoice, pillars, count = 5, trendContext, requirements }) {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(brandVoice, pillars, null, trendContext);

  const now = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const currentDate = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const userPrompt = `Generate ${count} specific content ideas for X posts.

These ideas should be:
- Specific and opinionated (not vague topic categories)
- Timely — things worth talking about in ${currentDate}
- Aligned with this account's role and audience
- The kind of topics that spark replies and engagement on X
${trendContext ? `- Connected to this current context: ${trendContext}` : ''}
${requirements ? `- Factor in these specific requirements/style notes: ${requirements}` : ''}

For each idea, provide:
- A specific topic/angle (not vague)
- A suggested post style from: hot_take, insight, storytelling, listicle, question, tutorial, observation
- A one-line preview of what the post would say

Format each idea as:
TOPIC: [specific topic]
STYLE: [style name]
PREVIEW: [one-line preview]
---

Return ONLY the ideas in this format. No intro, no outro.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.95,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from OpenAI');

    // Parse ideas
    const ideas = raw.split('---')
      .map(block => block.trim())
      .filter(block => block.length > 0)
      .map(block => {
        const lines = block.split('\n').map(l => l.trim());
        const topicLine = lines.find(l => l.startsWith('TOPIC:'));
        const styleLine = lines.find(l => l.startsWith('STYLE:'));
        const previewLine = lines.find(l => l.startsWith('PREVIEW:'));
        return {
          topic: topicLine ? topicLine.replace('TOPIC:', '').trim() : 'Untitled',
          style: styleLine ? styleLine.replace('STYLE:', '').trim().toLowerCase().replace(/\s+/g, '_') : 'insight',
          preview: previewLine ? previewLine.replace('PREVIEW:', '').trim() : '',
        };
      })
      .filter(idea => idea.topic !== 'Untitled');

    return {
      ideas,
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('OpenAI generateIdeas error:', error.message);
    throw error;
  }
}

/**
 * Generate an image using OpenAI (DALL-E 3)
 */
async function generateImage(prompt) {
  const client = getClient();
  
  try {
    logger.info('Generating image with OpenAI (DALL-E 3)...');
    
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error('Empty response from OpenAI DALL-E');

    return {
      url: imageUrl,
      provider: 'openai',
      prompt: prompt
    };
  } catch (error) {
    logger.error('OpenAI image generation error:', error.message);
    throw error;
  }
}

/**
 * Generate a prompt for image generation based on tweet content and brand voice
 */
async function generateImagePrompt({ tweetContent, brandVoice, niche }) {
  const client = getClient();
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert visual designer and prompt engineer. Create a highly descriptive, artistic, and effective image prompt for DALL-E based on a tweet. Avoid generic stock photos. Focus on mood, lighting, and composition. Return ONLY the prompt text.' 
        },
        { 
          role: 'user', 
          content: `Tweet: ${tweetContent}\nNiche: ${niche || 'General'}\nBrand Tone: ${brandVoice?.tone || 'Professional'}\n\nCreate a visual prompt.` 
        },
      ],
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || `A high-quality visual representing: ${tweetContent.substring(0, 100)}`;
  } catch (error) {
    logger.error('OpenAI prompt generation error:', error.message);
    return `A high-quality visual representing: ${tweetContent.substring(0, 100)}`;
  }
}

/**
 * Strip AI artifacts from output and enforce the 280-character hard limit.
 * Trims at the last word boundary before the limit so the tweet stays readable.
 */
function cleanOutput(text, limit = 280) {
  if (!text) return text;
  // Remove wrapping quotes
  let cleaned = text.replace(/^["']|["']$/g, '');
  // Remove leading labels like "Post:" or "Tweet:"
  cleaned = cleaned.replace(/^(Post|Tweet|Content|Text|Output):\s*/i, '');
  cleaned = cleaned.trim();

  // Hard-enforce character limit
  if (cleaned.length > limit) {
    // Trim at the last space before the limit so we don't cut mid-word
    const cutAt = cleaned.lastIndexOf(' ', limit);
    cleaned = cleaned.substring(0, cutAt > limit * 0.6 ? cutAt : limit).trim();
  }

  return cleaned;
}

module.exports = {
  generatePost,
  generateVariations,
  generateThread,
  generateIdeas,
  generateImage,
  generateImagePrompt,
  POST_STYLES,
  isConfigured: () => !!process.env.OPENAI_API_KEY,
};
