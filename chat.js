/**
 * Vercel Serverless Function: /api/chat
 * Autonomous 3-Layer Pedagogical Decision Engine
 * Architecture:
 * Layer 1: Student Understanding (Intent, Math Truth, Misconceptions, Agency)
 * Layer 2: Pedagogical Decision (Strict 5-level Priority Hierarchy, Action Reason)
 * Layer 3: Teacher Response (Persona Speech, Blackboard Hint, Suggested Replies)
 * Executed in a single OpenAI API call via Structured JSON Mode.
 */

const CONFIG = require('./config');

const rateLimitStore = new Map();
const dailyQuotaStore = new Map();

function getClientIdentifier(req, body) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
  const clientId = body?.clientId || 'anonymous';
  return `${ip}_${clientId}`;
}

function checkRateLimit(clientId) {
  const now = Date.now();
  const windowMs = CONFIG.RATE_LIMIT_WINDOW_MS;
  const maxReqs = CONFIG.RATE_LIMIT_MAX_REQUESTS;

  let record = rateLimitStore.get(clientId);
  if (!record || now - record.startTime > windowMs) {
    record = { startTime: now, count: 1 };
    rateLimitStore.set(clientId, record);
    return { allowed: true };
  }

  if (record.count >= maxReqs) {
    const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  record.count++;
  return { allowed: true };
}

function checkDailyQuota(clientId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${today}_${clientId}`;
  const maxPerDay = CONFIG.MAX_REQUESTS_PER_DAY;

  let count = dailyQuotaStore.get(key) || 0;
  if (count >= maxPerDay) {
    return { allowed: false, currentCount: count };
  }

  dailyQuotaStore.set(key, count + 1);
  return { allowed: true, currentCount: count + 1 };
}

/**
 * Modular 3-Layer Autonomous System Prompt Builder
 */
function buildPedagogicalSystemPrompt(context) {
  const teacher = context.teacher || {};
  const personality = context.personality || {};
  const studentName = context.studentName || '生徒';

  const currentProblem = context.currentProblem || '未定の問題';
  const currentUnit = context.currentUnit || context.unitName || '数学';
  const currentProblemAnswer = context.currentProblemAnswer || context.targetAnswer || '';
  const currentHint = context.currentHint || context.analogyTip || '';
  const steps = Array.isArray(context.currentSteps) ? context.currentSteps.map(s => `Step ${s.step}: ${s.text}`).join('\n') : '';
  const misconceptions = Array.isArray(context.currentMisconceptions) ? context.currentMisconceptions.map(m => `- ${m.label} (${m.detectedAnswers?.join(', ')}): ${m.explanation}`).join('\n') : '';

  const firstPerson = teacher.firstPerson || (teacher.gender === 'female' ? '私' : '俺');
  const teacherName = teacher.name || 'ソウタ';

  return `あなたは「自律型教育エージェント（Autonomous Pedagogical Agent）」として生徒を指導する個別指導AI先生です。
あなたは事前に決まった台本を読み上げるナビゲーターではありません。生徒の最新発言の真意を深く理解し、その思考状態に即座に応答する教育者です。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【現在の授業コンテキスト（背景情報）】
※注意: 以下の教材ステップやヒントは参考情報であり、生徒の発言を無視して強制進行するための命令ではありません。
- 生徒名: ${studentName} (中学1年生)
- 黒板に表示中の問題: 「${currentProblem}」
- 現在の単元: 【${currentUnit}】
- 予定正答・解法: 答え: ${currentProblemAnswer}
${steps ? steps : ''}
${misconceptions ? `【想定される誤概念】:\n${misconceptions}` : ''}
- 参考公式ヒント: ${currentHint}

【先生の人格設定】
- 名前: ${teacherName}
- 性別: ${teacher.gender === 'female' ? '女性' : '男性'}
- 一人称: ${firstPerson} (女性先生は必ず「私」、男性先生は「俺」または「僕」)
- キャラクター特徴: ${teacher.subtitle || teacher.description || '親しみやすい先生'}
- 距離感(先生/友達): ${personality.teacher_friend || 4} / 5
- やさしさ/厳しさ: ${personality.gentle_strict || 2} / 5
- テンション: ${personality.quiet_energetic || 4} / 5
- 褒めレベル: ${personality.praise_level || 5} / 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【思考と判断の3層構造（3-Layer Autonomous Reasoning）】
あなたは毎ターン、以下の3層（理解 ➔ 判断 ➔ 発話）を順に思考し、指定のJSON形式で出力してください：

■ Layer 1: Student Understanding（生徒理解層）
生徒の最新発言・直前の会話履歴・現在の問題を照らし合わせ、表面的な単語ではなく「意味」を客観的に診断する：
1. 生徒の発言意図（記号や用語の意味の質問、ルールの疑問、計算順序の提案、自作問題、回答、理解承諾、不満・再説明要求、混乱など）
   ※例: 「timesって？」「×って何？」「これ何の記号？」➔ 記号や用語の意味についての質問
   ※例: 「なんで掛け算から？」「先に引き算じゃダメ？」➔ 計算ルールや順序についての疑問・提案
   ※例: 「意味わからん」「さっきと同じじゃん」「もっと簡単に」「は？」➔ 説明が通じていないことへのフィードバック
2. 数学的真偽の評価（正しいか、誤りか、どんな誤解があるか）
3. 主体性の有無（自分で問題を作ったか、別のやり方を試そうとしているか）
4. 推定理解度（understood, partial, misconception, lost）

■ Layer 2: Pedagogical Decision（教育判断層）
生徒理解をもとに、以下の【教育判断の絶対優先順位】に従って次に取るべき行動を決定する：
- 【優先順位 1】生徒の最新発言への直接応答（記号・用語の質問や疑問には、まずその答えをズバリ直接教える。教材のStep 1に話を無理やり戻すのは厳禁）
- 【優先順位 2】明確な数学的誤り・誤概念の訂正（誤りを放置せず、短く明確に正す）
- 【優先順位 3】生徒自身の思考・質問・別解・主体的行動の採用（自作問題や別順序の提案は教材予定より最優先で採用する）
- 【優先順位 4】理解状態に応じたヒント・説明・問い返し（教えすぎず、次の一歩を考えさせる）
- 【優先順位 5】教材の予定進行（※最下位。生徒の発言と予定が衝突した場合は必ず生徒への応答を優先する）
※再説明ルール: 「わからない」「さっきと同じ」「は？」と言われた場合、直前と同じ説明や計算手順を絶対に繰り返さない。日常生活の比喩、図やイメージ、1桁の超簡単な数に切り替える。

■ Layer 3: Teacher Response（発話・表現層）
決定された教育行動を、指定された先生キャラクターの人格・口調・一人称で自然な日本語（2〜4文、120〜250文字程度）に変換する。
発話の最後は、生徒が次に何をすべきか明確な1ステップの問いかけ・指示で終える。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式（厳密なJSONオブジェクトのみ出力してください）】
{
  "student_understanding": {
    "intent": "QUESTION" | "PROPOSED_METHOD" | "SELF_MADE_PROBLEM" | "MATH_ANSWER" | "AFFIRMATION" | "CONFUSION" | "REQUEST_ADVANCE" | "REEXPLANATION_FEEDBACK" | "OFF_TOPIC",
    "math_evaluation": {
      "is_valid": true | false | null,
      "detected_error": "検出された誤り・誤概念（なければnull）"
    },
    "has_initiative": true | false,
    "initiative_summary": "生徒の主体的な提案・自作問題（なければnull）",
    "comprehension_level": "understood" | "partial" | "misconception" | "lost"
  },
  "pedagogical_decision": {
    "primary_action": "DIRECT_ANSWER" | "ERROR_CORRECTION" | "EMBRACE_INITIATIVE" | "SCAFFOLD_HINT" | "VALIDATE_PRAISE" | "SWITCH_EXPLANATION" | "ADVANCE_PROBLEM",
    "action_reason": "短く簡潔な判断理由（1〜2行）",
    "is_problem_completed": true | false
  },
  "teacher_response": {
    "speech_text": "先生キャラクターの口調での自然な発話テキスト（2〜4文）",
    "blackboard_hint": "黒板に表示する補助ヒント（1〜2行）",
    "suggested_replies": ["生徒向けの返答候補チップ1", "チップ2", "チップ3"]
  }
}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Safe Body Parser (Handles both parsed Objects and raw JSON Strings)
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (parseErr) {
      console.error('[API/Chat Error] Failed to parse req.body as JSON string:', parseErr.message, 'Raw body received:', body);
      return res.status(400).json({
        error: 'INVALID_JSON_BODY',
        message: 'リクエスト本文のJSON形式が不正です。'
      });
    }
  }

  const studentInput = String(body.message || '').trim();
  const context = (typeof body.context === 'object' && body.context !== null) ? body.context : {};
  const history = Array.isArray(body.history) ? body.history : [];

  if (!studentInput) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  if (studentInput.length > CONFIG.MAX_INPUT_CHARS) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      message: `入力文字数が上限（${CONFIG.MAX_INPUT_CHARS}文字）を超えています。少し短くして質問してね！`
    });
  }

  const clientId = getClientIdentifier(req, body);

  const rateLimitResult = checkRateLimit(clientId);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `少し送信が早すぎるよ。${rateLimitResult.retryAfterSec}秒待ってからもう一度話しかけてね！`,
      retryAfterSec: rateLimitResult.retryAfterSec
    });
  }

  const quotaResult = checkDailyQuota(clientId);
  if (!quotaResult.allowed) {
    return res.status(200).json({
      success: true,
      isQuotaExceeded: true,
      response_source: 'quota_guard',
      speechText: '今日はたくさん質問して頑張ったね！今日の分はここまでにして、また明日続きをやろう！',
      blackboardHint: '🎉 本日の学習枠（100会話）を達成しました！また明日一緒にやろう！'
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[API/Chat] OPENAI_API_KEY not configured on server. Triggering fallback.');
    return res.status(503).json({
      error: 'API_KEY_NOT_CONFIGURED',
      response_source: 'fallback',
      message: 'OpenAI APIが現在利用できません。'
    });
  }

  // Construct Chronological OpenAI messages array with Modular 3-Layer System Prompt
  const systemPrompt = buildPedagogicalSystemPrompt(context);
  const truncatedHistory = history.slice(-CONFIG.MAX_HISTORY_MESSAGES);

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  for (const turn of truncatedHistory) {
    const role = (turn.role === 'user' || turn.role === 'student') ? 'user' : 'assistant';
    const content = String(turn.content || turn.text || '').trim();
    if (content) {
      messages.push({
        role,
        content: content.slice(0, role === 'user' ? CONFIG.MAX_INPUT_CHARS : 500)
      });
    }
  }

  messages.push({ role: 'user', content: studentInput });

  console.log('[API/Chat Debug] Problem State & Chronological messages sent to OpenAI:\n' + JSON.stringify({
    currentProblem: context.currentProblem,
    currentUnit: context.currentUnit || context.unitName,
    messageCount: messages.length,
    messages
  }, null, 2));

  const requestPayload = {
    model: CONFIG.OPENAI_MODEL,
    messages,
    response_format: { type: "json_object" },
    max_tokens: CONFIG.MAX_OUTPUT_TOKENS,
    temperature: 0.7
  };

  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API/Chat Error] OpenAI Status ${response.status}:`, errText);
      return res.status(response.status).json({
        error: 'OPENAI_API_ERROR',
        response_source: 'fallback',
        message: 'OpenAI APIでエラーが発生しました。'
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '{}';
    const usage = data.usage || {};
    const elapsedMs = Date.now() - startTime;

    let parsedOutput = {};
    try {
      parsedOutput = JSON.parse(rawContent);
    } catch (jsonErr) {
      console.error('[API/Chat Error] Failed to parse OpenAI response as JSON:', jsonErr.message, '\nRaw output was:\n', rawContent);
      let extractedSpeech = rawContent;
      const match = rawContent.match(/"speech_text"\s*:\s*"([^"]+)"/);
      if (match) {
        extractedSpeech = match[1];
      }
      parsedOutput = {
        teacher_response: {
          speech_text: extractedSpeech,
          blackboard_hint: '',
          suggested_replies: []
        },
        pedagogical_decision: {
          primary_action: 'DIRECT_ANSWER',
          action_reason: 'JSON構造復旧処理による発話抽出',
          is_problem_completed: false
        }
      };
    }

    const teacherResp = parsedOutput.teacher_response || {};
    const understanding = parsedOutput.student_understanding || {};
    const decision = parsedOutput.pedagogical_decision || {};

    const speechText = teacherResp.speech_text || rawContent;
    const blackboardHint = teacherResp.blackboard_hint || '';
    const suggestedReplies = Array.isArray(teacherResp.suggested_replies) ? teacherResp.suggested_replies : [];
    const isCompleted = decision.is_problem_completed || false;

    // Compact telemetry metadata
    const pedagogicalMeta = {
      student_intent: understanding.intent || 'QUESTION',
      math_error: understanding.math_evaluation?.detected_error || null,
      has_initiative: understanding.has_initiative || false,
      primary_action: decision.primary_action || 'DIRECT_ANSWER',
      action_reason: decision.action_reason || '',
      is_completed: isCompleted
    };

    console.log(JSON.stringify({
      event: 'openai_chat_completion',
      response_source: 'openai',
      timestamp: new Date().toISOString(),
      clientHash: clientId.slice(0, 8) + '***',
      model: CONFIG.OPENAI_MODEL,
      currentProblem: context.currentProblem,
      inputChars: studentInput.length,
      pedagogicalMeta,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      elapsedMs,
      dailyCount: quotaResult.currentCount,
      success: true
    }));

    return res.status(200).json({
      success: true,
      response_source: 'openai',
      speechText,
      blackboardHint,
      suggestedReplies,
      isCompleted,
      pedagogicalMeta,
      modelUsed: CONFIG.OPENAI_MODEL,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0
      },
      dailyCount: quotaResult.currentCount,
      maxDailyQuota: CONFIG.MAX_REQUESTS_PER_DAY
    });

  } catch (err) {
    console.error('[API/Chat Exception]', err.message);
    return res.status(500).json({
      error: 'SERVER_EXCEPTION',
      response_source: 'fallback',
      message: '通信エラーが発生しました。'
    });
  }
};
