import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Code2, Copy, FileJson, Loader2, X } from 'lucide-react';
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

const PROMPT_TEMPLATE = `
당신은 파이썬 초보자를 위한 "코드 따라쓰기" 콘텐츠 제작자입니다.

중요한 전제:
- 아래 DATA_LOG_TEXT에는 운영자가 DATA LOG PDF에서 직접 복사한 텍스트 전체가 들어갑니다.
- DATA_LOG_TEXT는 깔끔한 코드 파일이 아니라, 대화식 설명과 코드 조각이 섞인 자료입니다.
- 목표는 대화문 전체를 문제화하는 것이 아니라, 이 유닛에서 새로 나온 개념과 핵심 코드 패턴만 골라 "코드 따라쓰기" 연습으로 만드는 것입니다.
- 학생은 정답 코드를 손으로 따라 치며 문법 패턴, 함수 사용, 들여쓰기, 자료형 구조를 익혀야 합니다.

입력 형식:
UNIT_TITLE:
[여기에 유닛 제목]

DATA_LOG_TEXT:
\`\`\`text
[여기에 DATA LOG PDF에서 복사한 텍스트 전체]
\`\`\`

생성 지침:
1. DATA_LOG_TEXT에서 새로 소개된 핵심 개념과 코드 패턴을 먼저 파악하세요.
2. 대화문, 등장인물 설명, 페이지 번호, 해설 문장, 오류 메시지 자체는 answerLines에 넣지 마세요.
3. 실제로 따라 쓰면 학습 가치가 있는 짧은 완성 코드만 2~5개의 exercises로 만드세요.
4. PDF 복사 과정에서 들여쓰기가 사라진 for/if/while/function 코드는 올바른 Python 문법으로 들여쓰기를 복원하세요.
5. "실수 예시", "오류 예시", "틀린 코드"는 answerLines로 만들지 마세요. 필요한 경우 commonMistakes에만 반영하세요.
6. answerLines는 한 exercise당 2~8줄 정도를 권장합니다. 너무 긴 코드는 핵심 단위로 나누세요.
7. 같은 개념을 중복 연습시키지 말고, 유닛의 새 개념을 대표하는 패턴을 우선하세요.
8. hints는 정답을 그대로 말하지 말고, 콜론, 괄호, 따옴표, 들여쓰기, list/tuple/range/for/turtle/pygame 함수의 역할을 짚어주세요.
9. 결과는 반드시 한국어 JSON만 출력하세요. 설명 문장이나 마크다운 코드블록은 붙이지 마세요.

JSON 출력 규칙:
- 반드시 첫 글자는 {, 마지막 글자는 } 이어야 합니다.
- \`\`\`json 같은 마크다운 코드블록을 절대 붙이지 마세요.
- JSON key와 문자열 값은 반드시 큰따옴표(")로 감싸세요.
- trailing comma, 주석, 말줄임표(...)를 넣지 마세요.
- answerCode 대신 answerLines 배열을 사용하세요.
- answerLines의 각 항목은 코드 한 줄만 담습니다. 한 항목 안에 실제 줄바꿈이나 \\n을 넣지 마세요.
- 파이썬 문자열은 의미가 같다면 작은따옴표(')를 우선 사용하세요. 예: print('Hello World!')
- 파이썬 코드 한 줄에 큰따옴표(")가 꼭 필요하면 JSON 규칙에 맞게 \\"로 이스케이프하세요.
- hints, prompt, commonMistakes.message 안에서는 큰따옴표 기호를 직접 쓰지 말고 "큰따옴표 기호"처럼 말로 설명하세요.
- 예를 들어 큰따옴표("")라고 쓰지 말고 큰따옴표 기호라고 쓰세요.
- 최종 출력 전에 JSON.parse()가 가능한 순수 JSON인지 스스로 검증하세요.

선정 예시:
- 자료형 확인 유닛: 변수에 int/str/list/tuple 값을 담고 type()으로 확인하는 코드
- for 유닛: range() 반복, 리스트 순회, 반복문 안/밖 들여쓰기 차이를 보여주는 올바른 코드
- turtle 유닛: 새로 배운 turtle 함수가 실제로 쓰이는 최소 코드
- pygame 유닛: 이벤트 루프, 화면 설정 등 외워야 하는 골격 코드

코드 정리 원칙:
- 원문 코드의 학습 의도는 보존하되, PDF 복사 때문에 깨진 들여쓰기는 반드시 고치세요.
- 문자열 안의 공백과 따옴표는 의미가 있으므로 함부로 바꾸지 마세요.
- 변수명은 원문에 나온 것을 우선 사용하세요.
- 불필요한 주석은 넣지 마세요. 단, 코드 안/밖 들여쓰기 차이를 설명해야 하는 경우 한 줄 주석은 허용합니다.

JSON 형식:
{
  "exercises": [
    {
      "title": "짧은 연습 제목",
      "level": 1,
      "category": "turtle | input_output | variable | condition | loop | function | pygame | 기타",
      "concepts": ["핵심개념1", "핵심개념2"],
      "prompt": "학생에게 보여줄 한두 문장 설명",
      "answerLines": [
        "코드 1번째 줄",
        "코드 2번째 줄",
        "    들여쓰기된 코드 줄"
      ],
      "hints": ["힌트1", "힌트2", "힌트3"],
      "commonMistakes": [
        { "type": "indentation", "message": "들여쓰기를 확인하세요." },
        { "type": "colon", "message": "반복문/조건문 줄 끝에는 콜론(:)이 필요합니다." }
      ],
      "passingAccuracy": 95
    }
  ]
}
`;

function stripJsonFences(input) {
  const trimmed = String(input || '').trim().replace(/^\uFEFF/, '');
  const fencedBlocks = Array.from(trimmed.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/g));
  const jsonBlock = fencedBlocks
    .map(match => match[1].trim())
    .find(block => block.includes('"exercises"') || block.startsWith('{') || block.startsWith('['));
  return jsonBlock || trimmed;
}

function extractBalancedJson(input) {
  const text = stripJsonFences(input);
  const start = text.search(/[\[{]/);
  if (start < 0) throw new Error('JSON 시작 문자({ 또는 [)를 찾지 못했습니다.');

  const opener = text[start];
  const stack = [opener];
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }

    if (char === '}' || char === ']') {
      const expected = stack[stack.length - 1] === '{' ? '}' : ']';
      if (char !== expected) {
        throw new Error(`JSON 괄호 짝이 맞지 않습니다. "${expected}"가 필요한 위치에 "${char}"가 있습니다.`);
      }
      stack.pop();
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }

  throw new Error('JSON이 닫히지 않았습니다. 마지막 } 또는 ]를 확인하세요.');
}

function escapeIllegalNewlinesInJsonStrings(candidate) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const char of candidate) {
    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        result += char;
        escaped = true;
        continue;
      }
      if (char === '"') {
        result += char;
        inString = false;
        continue;
      }
      if (char === '\n') {
        result += '\\n';
        continue;
      }
      if (char === '\r') {
        continue;
      }
      result += char;
      continue;
    }

    result += char;
    if (char === '"') inString = true;
  }

  return result;
}

function getNextNonWhitespace(text, startIndex) {
  for (let i = startIndex; i < text.length; i += 1) {
    if (!/\s/.test(text[i])) return text[i];
  }
  return '';
}

function escapeLikelyInnerQuotesInJsonStrings(candidate) {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < candidate.length; i += 1) {
    const char = candidate[i];

    if (!inString) {
      result += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      const next = getNextNonWhitespace(candidate, i + 1);
      if ([',', '}', ']', ':'].includes(next)) {
        result += char;
        inString = false;
      } else {
        result += '\\"';
      }
      continue;
    }

    result += char;
  }

  return result;
}

function sanitizeJsonCandidate(candidate) {
  const normalizedQuotes = candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  return escapeLikelyInnerQuotesInJsonStrings(escapeIllegalNewlinesInJsonStrings(normalizedQuotes))
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function parseAiJson(input) {
  const rawText = stripJsonFences(input);
  let candidate = '';
  try {
    candidate = extractBalancedJson(rawText);
    return { parsed: JSON.parse(candidate), repaired: false };
  } catch {
    const repairedText = sanitizeJsonCandidate(rawText);
    const repairedCandidate = extractBalancedJson(repairedText);
    try {
      return { parsed: JSON.parse(repairedCandidate), repaired: repairedCandidate !== candidate };
    } catch (secondError) {
      throw new Error(`JSON 파싱 실패: ${secondError.message}. answerLines 배열 형식인지, 큰따옴표와 쉼표가 올바른지 확인하세요.`);
    }
  }
}

function normalizeAnswerCode(raw, index) {
  if (Array.isArray(raw.answerLines)) {
    return raw.answerLines
      .map(line => String(line ?? '').replace(/\r/g, ''))
      .join('\n')
      .trim();
  }

  const legacyAnswerCode = String(raw.answerCode || '').replace(/\r\n/g, '\n').trim();
  if (legacyAnswerCode) return legacyAnswerCode;

  throw new Error(`${index + 1}번째 exercise에 answerLines가 없습니다.`);
}

function normalizeExercise(raw, index, unitId, timestamp) {
  const answerCode = normalizeAnswerCode(raw, index);
  if (!answerCode) throw new Error(`${index + 1}번째 exercise의 코드가 비어 있습니다.`);

  return {
    id: `${unitId}_code_${index + 1}_${timestamp}`,
    unitId,
    order: index,
    title: String(raw.title || `코드 따라쓰기 ${index + 1}`).trim(),
    level: Math.max(1, Number(raw.level) || 1),
    category: String(raw.category || 'python').trim(),
    concepts: Array.isArray(raw.concepts) ? raw.concepts.map(String).filter(Boolean) : [],
    prompt: String(raw.prompt || '').trim(),
    answerCode,
    hints: Array.isArray(raw.hints) ? raw.hints.map(String).filter(Boolean) : [],
    commonMistakes: Array.isArray(raw.commonMistakes) ? raw.commonMistakes : [],
    passingAccuracy: Math.min(100, Math.max(70, Number(raw.passingAccuracy) || 95)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

export default function AiCodeTraceImportModal({ isOpen, onClose, unitId }) {
  const [step, setStep] = useState('prompt');
  const [jsonInput, setJsonInput] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep('prompt');
    setJsonInput('');
    setLogs([]);
  }, [isOpen, unitId]);

  if (!isOpen) return null;

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(PROMPT_TEMPLATE);
    alert('코드 따라쓰기 프롬프트가 복사되었습니다. DATA LOG PDF에서 복사한 텍스트 전체와 함께 AI에 붙여넣으세요.');
    setStep('input');
  };

  const importExercises = async () => {
    try {
      setStep('processing');
      setLogs(['JSON 파싱 중...']);

      const { parsed, repaired } = parseAiJson(jsonInput);
      const exerciseSource = Array.isArray(parsed) ? parsed : parsed.exercises;
      if (repaired) {
        setLogs(prev => [...prev, 'AI 출력의 흔한 JSON 문제를 자동 보정했습니다.']);
      }
      if (!Array.isArray(exerciseSource)) {
        throw new Error('JSON에는 exercises 배열이 있어야 합니다.');
      }
      if (exerciseSource.length === 0) {
        throw new Error('가져올 exercise가 없습니다.');
      }

      const timestamp = Date.now();
      const exercises = exerciseSource.map((item, index) => normalizeExercise(item, index, unitId, timestamp));
      setLogs(prev => [...prev, `${exercises.length}개의 코드 따라쓰기 항목을 확인했습니다.`, '기존 항목 삭제 중...']);

      const batch = writeBatch(db);
      const existingQuery = query(collection(db, 'codeExercises'), where('unitId', '==', unitId));
      const existingSnap = await getDocs(existingQuery);
      existingSnap.docs.forEach(existing => batch.delete(existing.ref));

      exercises.forEach(exercise => {
        batch.set(doc(db, 'codeExercises', exercise.id), exercise);
      });

      batch.update(doc(db, 'units', unitId), {
        lastUpdated: serverTimestamp(),
        'contentFlags.hasCodeTrace': true
      });

      await batch.commit();
      setLogs(prev => [...prev, `기존 ${existingSnap.size}개 삭제, 새 ${exercises.length}개 저장 완료.`]);
      setStep('success');
    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
      setStep('error');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          className="card glass"
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '720px', maxWidth: '92vw', maxHeight: '86vh', overflowY: 'auto', padding: '2rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Code2 /> AI Code Trace Importer
            </h2>
            <button className="icon-btn" onClick={onClose}><X /></button>
          </div>

          {step === 'prompt' && (
            <div>
              <p style={{ lineHeight: 1.7 }}>
                DATA LOG PDF에서 복사한 텍스트 전체를 아래 프롬프트와 함께 ChatGPT/Gemini에 붙여넣으세요.
                AI는 대화식 설명에서 새 개념과 핵심 코드만 골라 코드 따라쓰기 JSON을 만듭니다.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '1rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.86rem', maxHeight: '44vh', overflowY: 'auto' }}>
                {PROMPT_TEMPLATE}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button className="primary-btn" onClick={copyPrompt}><Copy size={18} /> 프롬프트 복사 & 다음</button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div>
              <p>AI가 생성한 JSON을 붙여넣으면 이 유닛의 기존 코드 따라쓰기 항목을 교체합니다.</p>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='{ "exercises": [...] }'
                style={{ width: '100%', minHeight: '320px', background: 'rgba(0,0,0,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '1rem', fontFamily: 'monospace' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button className="secondary-btn" onClick={() => setStep('prompt')}>이전</button>
                <button className="primary-btn" onClick={importExercises} disabled={!jsonInput.trim()}><FileJson size={18} /> 가져오기</button>
              </div>
            </div>
          )}

          {(step === 'processing' || step === 'error' || step === 'success') && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                {step === 'processing' && <Loader2 className="spin" />}
                {step === 'success' && <Check style={{ color: 'var(--planet-green)' }} />}
                <h3 style={{ margin: 0 }}>{step === 'success' ? '가져오기 완료' : step === 'error' ? '오류 발생' : '처리 중'}</h3>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 8, padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {logs.map((log, index) => <div key={index}>{log}</div>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                {step === 'error' && <button className="secondary-btn" onClick={() => setStep('input')}>수정하기</button>}
                {step === 'success' && <button className="primary-btn" onClick={onClose}>닫기</button>}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
