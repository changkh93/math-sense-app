import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Code2, Copy, FileJson, Loader2, X } from 'lucide-react';
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

const PROMPT_TEMPLATE = `
당신은 파이썬 초보자를 위한 "코드 따라쓰기" 콘텐츠 제작자입니다.

중요한 전제:
- 아래 SOURCE_CODE에는 운영자가 DATA LOG PDF에서 직접 복사한 정답 소스 코드가 들어갑니다.
- 정답 코드(answerCode)는 SOURCE_CODE의 의미와 구조를 보존해야 합니다.
- 문법 오류가 명백한 경우를 제외하고, 코드를 더 예쁘게 고치거나 다른 방식으로 재작성하지 마세요.
- 학생은 정답 코드를 그대로 따라 치면서 손에 익히는 것이 목표입니다.

입력 형식:
UNIT_TITLE:
[여기에 유닛 제목]

SOURCE_CODE:
\`\`\`python
[여기에 DATA LOG PDF에서 복사한 정답 코드]
\`\`\`

생성 지침:
1. 긴 코드는 2~5개의 작은 exercises로 나눕니다. 짧은 코드는 1개만 만들어도 됩니다.
2. 각 exercise의 answerCode는 실제로 학생이 따라 쓸 완성 코드여야 합니다.
3. blankCode는 answerCode에서 핵심 함수명, 키워드, 숫자, 변수명 일부만 _____로 가립니다.
4. hints는 정답을 그대로 말하지 말고, 콜론, 괄호, 따옴표, 들여쓰기, turtle/pygame 함수의 역할을 짚어주세요.
5. commonMistakes는 초보자가 자주 틀릴 수 있는 지점을 담습니다.
6. 결과는 반드시 한국어 JSON만 출력하세요. 설명 문장이나 마크다운 코드블록은 붙이지 마세요.

JSON 형식:
{
  "exercises": [
    {
      "title": "짧은 연습 제목",
      "level": 1,
      "category": "turtle | input_output | variable | condition | loop | function | pygame | 기타",
      "concepts": ["핵심개념1", "핵심개념2"],
      "prompt": "학생에게 보여줄 한두 문장 설명",
      "answerCode": "정답 코드 전체. 줄바꿈은 \\n으로 유지",
      "blankCode": "빈칸 버전 코드. 빈칸은 _____ 사용",
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

function extractJson(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : trimmed;
}

function normalizeExercise(raw, index, unitId, timestamp) {
  const answerCode = String(raw.answerCode || '').replace(/\r\n/g, '\n').trim();
  if (!answerCode) throw new Error(`${index + 1}번째 exercise에 answerCode가 없습니다.`);

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
    blankCode: String(raw.blankCode || answerCode).replace(/\r\n/g, '\n').trim(),
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
    alert('코드 따라쓰기 프롬프트가 복사되었습니다. DATA LOG PDF에서 복사한 소스 코드와 함께 AI에 붙여넣으세요.');
    setStep('input');
  };

  const importExercises = async () => {
    try {
      setStep('processing');
      setLogs(['JSON 파싱 중...']);

      const parsed = JSON.parse(extractJson(jsonInput));
      if (!Array.isArray(parsed.exercises)) {
        throw new Error('JSON에는 exercises 배열이 있어야 합니다.');
      }
      if (parsed.exercises.length === 0) {
        throw new Error('가져올 exercise가 없습니다.');
      }

      const timestamp = Date.now();
      const exercises = parsed.exercises.map((item, index) => normalizeExercise(item, index, unitId, timestamp));
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
                DATA LOG PDF에서 정답 소스 코드를 직접 복사한 뒤, 아래 프롬프트와 함께 ChatGPT/Gemini에 붙여넣으세요.
                AI는 그 코드를 기준으로 코드 따라쓰기 JSON을 만듭니다.
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
