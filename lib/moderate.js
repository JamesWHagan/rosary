/*
 * Decade4U: checking a new intention before anyone prays for it.
 *
 * 1. Quick checks: contact details, links, a small word list.
 * 2. Llama Guard (Cloudflare Workers AI): harmful content.
 * 3. A small AI model answers our own questions about the intention.
 *
 * Result:
 *   "approved" - clearly fine, people can pray for it straight away
 *   "pending"  - unsure, in crisis, or the AI was unavailable: the maintainer decides
 *   "rejected" - clearly abusive or not an intention: refused with a gentle message
 *
 * Rule: if anything goes wrong, the answer is "pending", never "approved".
 */

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINK = /(https?:\/\/|www\.|\.(com|net|org|it|io|ly)\b)/i;

// A starting list. The maintainer will add Italian and Sinhala words.
const BLOCK_WORDS = [
  "fuck", "shit", "bitch", "bastard", "cunt", "nigger", "faggot", "whore", "slut", "retard",
  "cazzo", "vaffanculo", "stronzo", "puttana", "troia", "frocio", "negro", "coglione", "merda"
];

const CRISIS = [
  "suicide", "suicidal", "kill myself", "end my life", "take my own life", "want to die",
  "don't want to live", "dont want to live", "do not want to live", "don't want to be alive", "do not want to be alive",
  "no reason to live", "end it all", "better off dead", "better off without me", "self harm", "self-harm", "hurt myself", "cut myself", "overdose",
  "suicidio", "suicidarmi", "uccidermi", "togliermi la vita", "farla finita", "voglio morire",
  "non voglio più vivere", "non voglio piu vivere", "non ce la faccio più a vivere", "meglio morto", "meglio morta", "farmi del male", "autolesion"
];

function hasWord(text, list) {
  const t = " " + text.toLowerCase().replace(/[^\p{L}\p{N}' -]/gu, " ") + " ";
  return list.some((w) => t.includes(" " + w + " ") || (w.includes(" ") && t.includes(w)));
}

export function quickChecks(intention, thanks) {
  const all = intention + " " + thanks;
  if (EMAIL.test(all) || PHONE.test(all)) return { decision: "rejected", reason: "contact details", message: "Please remove contact details like phone numbers or email addresses." };
  if (LINK.test(all)) return { decision: "rejected", reason: "link", message: "Intentions can't contain web links." };
  if (hasWord(all, BLOCK_WORDS)) return { decision: "rejected", reason: "word filter", message: "This intention contains words we can't accept. Please write it respectfully." };
  const crisis = CRISIS.some((w) => all.toLowerCase().includes(w));
  return { decision: "continue", crisis };
}

const QUESTIONS = `You help moderate a Catholic website where people share short prayer intentions and strangers pray a decade of the rosary for them.
Read the intention and answer ONLY with JSON, no other text:
{"prayer_intention": true|false, "identifying_details": true|false, "crisis": true|false, "hateful_or_mocking": true|false, "advertising_or_spam": true|false}
- prayer_intention: a sincere request for prayer for oneself, someone else, a situation or the world (any language). Thanksgiving intentions count.
- identifying_details: a full name (first name + surname), address, workplace, school, or anything that could identify a private person. A first name alone is fine.
- crisis: the writer may be in danger or thinking of suicide or self-harm.
- hateful_or_mocking: insults, mockery of faith, hatred toward a person or group, sexual content.
- advertising_or_spam: selling, promoting, or gibberish.`;

function parseJson(value) {
  // Workers AI may hand back the answer already as an object, or as text containing JSON.
  if (value && typeof value === "object") {
    if ("prayer_intention" in value) return value;
    if ("response" in value) return parseJson(value.response);
  }
  const m = String(value || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

export async function moderate(env, intention, thanks) {
  const quick = quickChecks(intention, thanks);
  if (quick.decision === "rejected") return { ...quick, care: false };
  const care = quick.crisis;

  if (!env.AI) return { decision: "pending", reason: "AI not connected", care };

  try {
    const text = thanks ? `Intention: ${intention}\nThank-you message: ${thanks}` : `Intention: ${intention}`;

    // 2. Llama Guard
    const guard = await env.AI.run("@cf/meta/llama-guard-3-8b", { messages: [{ role: "user", content: text }] });
    const guardText = JSON.stringify(guard.response ?? guard).toLowerCase();
    const unsafe = guardText.includes("unsafe");
    // Llama Guard categories: S1 violent crimes, S3 sex crimes, S4 child exploitation, S9 weapons,
    // S10 hate, S12 sexual content -> refused. S11 self-harm -> crisis care. Anything else
    // (for example S7 privacy) -> a person decides.
    const cats = unsafe ? (guardText.match(/s\d+/g) || []) : [];
    const HARD = ["s1", "s3", "s4", "s9", "s10", "s12"];
    const hardUnsafe = cats.some((c) => HARD.includes(c));
    const selfHarm = cats.includes("s11");
    const otherUnsafe = unsafe && !hardUnsafe && !selfHarm;

    // 3. Our own questions
    const out = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8-fast", {
      messages: [{ role: "system", content: QUESTIONS }, { role: "user", content: text }],
      max_tokens: 80,
      temperature: 0
    });
    const a = parseJson(out);
    if (!a) return { decision: "pending", reason: "AI answer unreadable: " + JSON.stringify(out).slice(0, 150), care };

    const crisis = care || a.crisis === true || selfHarm;
    const summary = `guard:${unsafe ? "unsafe" : "safe"} ai:${JSON.stringify(a)}`;

    if (a.hateful_or_mocking === true || hardUnsafe)
      return { decision: "rejected", reason: summary, care: crisis, message: "This intention can't be accepted. Please write it respectfully, as a prayer request." };
    if (a.advertising_or_spam === true && a.prayer_intention !== true)
      return { decision: "rejected", reason: summary, care: crisis, message: "This doesn't look like a prayer intention. Please write what you'd like prayed for." };
    if (crisis) return { decision: "pending", reason: summary, care: true };
    if (a.identifying_details === true || otherUnsafe) return { decision: "pending", reason: summary, care: false };
    if (a.prayer_intention === true) return { decision: "approved", reason: summary, care: false };
    return { decision: "pending", reason: summary, care: false };
  } catch (e) {
    // Out of free AI allowance, or any other problem: a person decides.
    return { decision: "pending", reason: "AI unavailable: " + String(e && e.message || e).slice(0, 80), care };
  }
}
