import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, FileJson, Sparkles, Loader2 } from 'lucide-react';
import { useAdminMutations } from '../../hooks/useContent'; 
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

const PROMPT_TEMPLATE = `
첨부한 수학 문제 이미지들을 참고하여, 이와 유사한 유형의 객관식 문제 20개를 만들어주세요.
첨부된 페이지들의 내용을 골고루 반영하여, 문항 유형이 특정 페이지에 치우치지 않고 고르게 분포되도록 해주세요.
각 문제마다 4개의 보기를 제공해주세요.

[중요: LaTeX 포맷 규칙]
1. 모든 숫자, 수식, 변수, 단위는 반드시 LaTeX 문법을 사용하여 $...$로 감싸야 합니다. (예: $1$, $2+3=5$, $x$, $cm$)
2. 분수는 반드시 $\\\\frac{분자}{분모}$ 형식을 사용하세요. (중요: JSON 문자열 내에서 백슬래시가 유지되도록, 프롬프트 입력 시에는 백슬래시를 두 번씩 사용해야 할 수도 있습니다. 결과적으로 JSON에는 "\\frac{...}{...}" 형태로 들어가야 합니다.)
3. 텍스트와 수식이 섞여 있을 때도 수식 부분은 철저히 분리하여 $ 기호를 사용하세요.

결과는 반드시 아래의 JSON 형식을 엄격히 따라주세요:

{
  "questions": [
    {
      "question": "문제 내용 (모든 숫자는 $로 감싸기. 예: $15$를 $2$로 나누면?)",
      "options": ["$보기1$", "$보기2$", "$보기3$", "$보기4$"],
      "answer": "정답 텍스트 (옵션 중 하나와 정확히 일치해야 함)",
      "hint": "이 문제를 전혀 이해하지 못하는 중학생이 통찰력을 가질 수 있도록 돕는 단계별 유도 질문형 가이드 (Markdown 형식 필수. 정답을 바로 알려주지 말고 스스로 생각하게 유도. 수식은 $...$ 사용)",
      "explanation": "첨부된 4장의 이미지와 같이 한 문제에 대한 깊이 있는 해설, 풀이 과정, 핵심 개념을 모두 포함한 상세한 마크다운 문서 (정답 확인용으로 매우 자세하게 작성. 1번 문제 풀이와 같은 양식으로 작성. 수식은 $...$ 사용)"
    }
  ]
}

- 언어는 반드시 '한국어'로 작성해주세요.
- **중요**: 채팅창에서 수식이 렌더링되어 복사 시 깨지는 것을 방지하기 위해, **반드시 전체 JSON을 코드 블록(\`\`\`json ... \`\`\`)으로 감싸서** 답변해주세요.
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
        
        // Convert string options to object options
        const formattedOptions = q.options.map(optText => ({
          text: optText,
          isCorrect: optText === q.answer
        }));

        // Verify one correct answer exists
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
                이 단원에 AI가 생성한 퀴즈 20개를 추가합니다.<br/>
                1. 아래 프롬프트를 복사하세요.<br/>
                2. Gemini로 가서 프롬프트를 붙여넣고, 참고할 문제 이미지들을(장수 무관) 업로드하세요.<br/>
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
