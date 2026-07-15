import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, FileJson, Sparkles, Loader2 } from 'lucide-react';
import { useAdminMutations } from '../../hooks/useContent'; 
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { auditQuizOptionStyle } from '../../utils/quizOptionStyleAudit';

const PROMPT_TEMPLATE = `
첨부한 파일의 문제와 옵션을 수정하지 말고, 그대로 퀴즈 포맷으로 변환해 주세요. 
하나도 빠짐없이 모든 문제를 순서대로 만들어야 합니다. 
각 문제마다 5개의 보기를 제공해주세요. (이미지에 보기가 적거나 없더라도 5지 선다형으로 구성하거나, 이미지의 내용을 최대한 존중하여 5개로 맞추어 주세요.)

I. "hint" 필드 작성 지침 (추상적 사고 단계):
사실은 힌트가 아니고 개념 설명란입니다. **[추상적 사고 단계]**를 반드시 따라야 하며, 학생이 단순히 단답형으로 대답하게 하지 말고, 통찰력을 얻을 수 있는 단계별 설명과 추가 질문을 충실하게 제공해야 합니다. 정답은 절대 직접 제시하지 말고, 학생이 스스로 도달하도록 유도하세요.

1. **[관찰 단계]**: 문제에서 주어진 시각적 요소나 수치 정보 중 '가장 먼저 확인해야 할 핵심 데이터'에 주목하게 하는 질문을 던지세요. 
2. **[개념 연결]**: 해당 데이터가 어떤 수학적 정의나 규칙과 연결되는지 스스로 떠올리게 하세요. **[핵심]** 학생이 개념을 완벽히 모른다고 가정하고, 필요한 모든 개념을 단계별로 충실하고 친절하게 개념을 먼저 설명해 주세요. 
3. **[과정 추론]**: 첫 번째 논리에서 두 번째 논리로 넘어가는 '변화의 과정'을 질문하세요. 개념과 개념의 연결, 사고력을 확장할 수 있도록 추가 설명을 해주세요. 학생이 흔히 할 수 있는 실수나 주의점을 미리 짚어주어 올바른 길로 안내하세요.
4. **[결론 유도]**: 모든 과정을 거쳤을 때 최종적으로 도달하게 되는 '상태'나 '값'이 무엇인지 묻는 질문으로 마무리하세요. 마지막 연산은 반드시 학생의 몫으로 남겨둡니다.

II. "explanation" 필드 작성 지침:
상세한 풀이를 아래와 같은 형식으로 작성하세요.

## 문제 풀이
**문제 내용:** [여기에 문제 텍스트와 보기를 포함하세요. 예: 세 자리 자연수 $N$과 $108$의 최대공약수가 $36$일 때, 다음 중 $N$의 값이 될 수 없는 것은?]

### 이 문제를 풀기 위해 무엇을 알아야 할까요? (핵심 개념 체크)
1. **[핵심 개념 명칭]:** [개념에 대한 상세 설명. 수식은 $...$ 사용. 예: 두 수의 최대공약수가 $G$라면, 두 수는 $G \times a, G \times b$로 표현되고 이때 $a$와 $b$는 반드시 서로소여야 합니다.]

### 어떻게 접근해야 할까요? (풀이 전략)
[풀이 전략 및 논리적 접근 단계 설명. 예: $GCD(N, 108) = 36$이므로 $N=36a, 108=36b$로 놓고 $a$의 조건을 찾습니다.]

### 차근차근 풀어봅시다! (단계별 상세 풀이)
1. **[단계 제목]:** [상세 계산 및 추론 과정]
2. **[단계 제목]:** [상세 계산 및 추론 과정]
...

### 이런 실수는 하지 마세요! / 더 알아두면 좋아요 (주의점 및 팁)
* **[주의점 제목]:** [실수하기 쉬운 포인트나 유용한 팁. 예: '서로소' 조건이 핵심! 최대공약수로 묶어내고 남은 부분들이 서로소라는 점을 놓치면 함정에 빠지기 쉽습니다.]

III. [중요: LaTeX 포맷 규칙]
1. 모든 숫자, 수식, 변수, 단위는 반드시 LaTeX 문법을 사용하여 $...$로 감싸야 합니다. (예: $1$, $2+3=5$, $x$, $cm$)
2. 분수는 반드시 $\\\\frac{분자}{분모}$ 형식을 사용하세요. (중요: JSON 문자열 내에서 백슬래시가 유지되도록, 결과적으로 JSON에는 "\\\\frac{...}{...}" 형태로 들어가야 합니다.)
3. 텍스트와 수식이 섞여 있을 때도 수식 부분은 철저히 분리하여 $ 기호를 사용하세요.

IV. [중요: 선택지 길이와 구체성 균형]
1. 정답만 유일하게 길거나 자세하면 안 됩니다. 정답의 길이로 답을 추측할 수 없도록 모든 보기를 비슷한 문법 형식과 구체성으로 작성하세요.
2. 정답이 긴 설명문이면 오답도 같은 수준의 완결된 설명문으로 작성하고, 핵심 용어만 묻는 문제라면 정답을 포함한 모든 보기를 짧은 용어로 통일하세요.
3. 각 보기의 글자 수는 정답 글자 수의 대략 65~125% 범위로 맞추고, 적어도 하나의 오답은 정답과 같거나 조금 더 길게 작성하세요.
4. 길이만 늘리기 위한 군더더기, 정답의 동의어·부분 정답, 터무니없는 오답은 금지합니다.
5. “작품의 맥락에서”, “해당 장면의 구체적인 단서”, “작품 전체의 인물·사건 흐름을 기준으로”, “~라는 설명”처럼 정오 판단 과정 자체를 말하는 메타 문구를 선택지에 쓰지 마세요. 각 보기는 질문에 바로 답하는 자연스러운 문장 또는 명사구여야 합니다.

결과는 반드시 아래의 JSON 형식을 엄격히 따라주세요:

{
  "questions": [
    {
      "question": "문제 내용 (모든 숫자는 $로 감싸기)",
      "options": ["$보기1$", "$보기2$", "$보기3$", "$보기4$", "$보기5$"],
      "answer": "정답 텍스트 (옵션 중 하나와 정확히 일치해야 함)",
      "hint": "Markdown 형식의 단계별 유도 가이드 (위의 I 지침 준수)",
      "explanation": "Markdown 형식의 상세 풀이 (위의 II 지침 준수)"
    }
  ]
}

- 언어는 반드시 '한국어'로 작성해주세요.
- [cite: 102]와 같은 출처 표현은 절대 하지 마세요.
- **중요**: 전체 JSON을 코드 블록(\`\`\`json ... \`\`\`)으로 감싸서 답변해주세요.
`;

export default function AiQuizImportModal({ isOpen, onClose, unitId }) {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'input' | 'processing' | 'success'
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const { saveQuiz } = useAdminMutations(); // Wait, useQuizzes is a query hook, not in useAdminMutations.
  // We need to import useQuizzes separately or likely it was imported from useContent.
  // Checking imports...
  // useUnits was imported in original file. We need useQuizzes now.

  // Fetch existing quizzes to determine order
  // NOTE: We need to import useQuizzes from hooks/useContent
  // But wait, we can't conditionally call hooks or change imports easily in one replace block if we don't change the imports line.
  // Let's assume I fix the import below.

  const copyToClipboard = () => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE);
    alert('프롬프트가 복사되었습니다! 이제 Gemini에 이미지를 업로드하고 붙여넣으세요.');
    setStep('input');
  };

  const handleParseAndImport = async () => {
    try {
      setStep('processing');
      setLogs(['Starting import process...']);

      // 1. Parse JSON
      let data;
      try {
        // Remove markdown code blocks if present (more robust regex)
        // Matches ```json ... ``` or just ``` ... ```
        const jsonMatch = jsonInput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const cleanJson = jsonMatch ? jsonMatch[1] : jsonInput.trim();
        
        data = JSON.parse(cleanJson);
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your input and ensure it is valid JSON.');
      }

      if (!Array.isArray(data.questions)) {
        throw new Error('JSON structure must contain "questions" array.');
      }

      const styleIssues = data.questions.flatMap((question, questionIndex) => {
        const audit = auditQuizOptionStyle(question.options);
        return audit.matches.map((match) => ({ questionIndex, ...match }));
      });
      if (styleIssues.length) {
        const questionNumbers = [...new Set(styleIssues.map((issue) => issue.questionIndex + 1))].slice(0, 10);
        throw new Error(
          `정답 단서가 되는 반복 문구가 포함된 문제가 있습니다: ${questionNumbers.join(', ')}번. ` +
          '“작품의 맥락에서”, “해당 장면의 구체적인 단서”, “~라는 설명” 같은 표현을 제거해주세요.'
        );
      }

      setParsedData(data);
      setLogs(prev => [...prev, `Parsed ${data.questions.length} questions.`]);

      // 2. Delete Existing Quizzes (Replace All)
      setLogs(prev => [...prev, `Clearing existing quizzes...`]);
      try {
        const q = query(collection(db, 'quizzes'), where('unitId', '==', unitId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            setLogs(prev => [...prev, `Deleted ${snapshot.size} old quizzes.`]);
        }
      } catch (delErr) {
        console.error("Deletion failed", delErr);
        throw new Error("Failed to clear existing quizzes: " + delErr.message);
      }

      // 3. Import New Quizzes
      setLogs(prev => [...prev, `Adding new quizzes...`]);
      
      let successCount = 0;
      // Since we cleared old quizzes, we can generate cleaner IDs using index
      // But adding timestamp ensures uniqueness against any lingering cache or edge cases
      const timestamp = Date.now(); 

      for (const [index, q] of data.questions.entries()) {
        const quizId = `${unitId}_q${index + 1}_${timestamp}`;
        
        // Convert string options to object options (supports multi-answer)
        const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
        const formattedOptions = q.options.map(optText => ({
          text: optText,
          isCorrect: answers.includes(optText)
        }));

        // Verify at least one correct answer exists
        if (!formattedOptions.some(o => o.isCorrect)) {
            console.warn(`No exact match for answer "${q.answer}" in options`, q.options);
            if (formattedOptions.length > 0) formattedOptions[0].isCorrect = true; 
        }

        const quizData = {
          id: quizId,
          unitId: unitId,
          question: q.question,
          options: formattedOptions,
          answer: q.answer, 
          hint: q.hint || '',
          explanation: q.explanation || '',
          score: 1,
          order: 999 + index // Just put it at the end. Ideally we'd query existing count, but for now 999+ ensures it's likely last or we can reorder later.
        };

        await saveQuiz.mutateAsync(quizData);
        successCount++;
      }

      setLogs(prev => [...prev, `Successfully imported ${successCount} questions!`]);
      setStep('success');

    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, `ERROR: ${err.message}`]);
      // Stop checking, show error state or allow retry
      // We will keep it in processing view but show a button to go back
      setStep('error');
    }
  };

  const reset = () => {
    setStep('prompt');
    setJsonInput('');
    setLogs([]);
    setParsedData(null);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, unitId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}
      >
        <motion.div 
          className="card glass"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '600px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', padding: '2rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles className="text-primary" /> AI Quiz Importer
            </h2>
            <button className="icon-btn" onClick={onClose}><X /></button>
          </div>

          {step === 'prompt' && (
            <div className="step-prompt">
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                첨부한 이미지의 문제를 그대로 퀴즈로 변환하여 추가합니다.<br/>
                1. 아래 프롬프트를 복사하세요.<br/>
                2. Gemini로 가서 프롬프트를 붙여넣고, 참고할 문제 이미지들을 업로드하세요.<br/>
                3. Gemini의 JSON 응답을 복사해서 이곳에 붙여넣으세요.
              </p>
              
              <div className="code-block" style={{ 
                background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', 
                fontSize: '0.9rem', marginBottom: '1.5rem', whiteSpace: 'pre-wrap', 
                fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' 
              }}>
                {PROMPT_TEMPLATE}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="primary-btn" onClick={copyToClipboard}>
                  <Copy size={18} /> 프롬프트 복사 & 다음
                </button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="step-input">
              <p style={{ marginBottom: '1rem' }}>Gemini가 생성한 JSON을 아래에 붙여넣으세요:</p>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='{ "questions": [...] }'
                style={{ 
                  width: '100%', height: '300px', background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', 
                  padding: '1rem', color: 'var(--text-primary)', fontFamily: 'monospace' 
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button className="text-btn" onClick={() => setStep('prompt')}>뒤로</button>
                <button className="primary-btn" onClick={handleParseAndImport} disabled={!jsonInput.trim()}>
                  <FileJson size={18} /> 파싱 및 가져오기
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="step-processing" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Loader2 size={48} className="spin text-primary" style={{ marginBottom: '1rem' }} />
              <h3>퀴즈 가져오는 중...</h3>
              <div className="logs" style={{ 
                marginTop: '1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.2)', 
                padding: '1rem', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' 
              }}>
                {logs.map((log, i) => <div key={i} style={{ fontSize: '0.85rem', marginBottom: '4px', color: log.includes('ERROR') ? '#ff6b6b' : 'inherit' }}>{log}</div>)}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="step-error" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ 
                width: '64px', height: '64px', background: 'rgba(220, 38, 38, 0.2)', 
                color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', margin: '0 auto 1.5rem' 
              }}>
                <X size={32} />
              </div>
              <h3>오류 발생</h3>
              <div className="logs" style={{ 
                marginTop: '1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.2)', 
                padding: '1rem', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto',
                border: '1px solid rgba(220, 38, 38, 0.3)'
              }}>
                {logs.map((log, i) => <div key={i} style={{ fontSize: '0.85rem', marginBottom: '4px', color: log.includes('ERROR') ? '#ff6b6b' : 'inherit' }}>{log}</div>)}
              </div>
               <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="text-btn" onClick={() => { onClose(); reset(); }}>취소</button>
                <button className="primary-btn" onClick={() => setStep('input')}>다시 입력하기</button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="step-success" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ 
                width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.2)', 
                color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', margin: '0 auto 1.5rem' 
              }}>
                <Check size={32} />
              </div>
              <h3>가져오기 완료!</h3>
              <p style={{ opacity: 0.7, margin: '1rem 0' }}>
                성공적으로 <strong>{parsedData?.questions?.length}</strong>개의 문제를 단원에 추가했습니다.
              </p>
              <button className="primary-btn" onClick={() => { onClose(); reset(); }}>
                닫기
              </button>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
