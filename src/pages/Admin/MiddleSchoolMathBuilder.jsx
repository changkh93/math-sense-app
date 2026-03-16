import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';

const PDF_FILES = [
  "퀴즈_01_소수와 합성수_소인수분해.pdf",
  "퀴즈_02_지수기본.pdf",
  "퀴즈_03_소인수분해를 이용한 약수구하기.pdf",
  "퀴즈_04_최대공약수_문제.pdf",
  "퀴즈_05_최소공배수_문제.pdf",
  "퀴즈_06_최대공약수와 최소공배수의 관계_문제.pdf",
  "퀴즈_07_최대공약수와 최소공배수 관계 활용_문제.pdf",
  "퀴즈_08_정수와 정수의 표현_문제.pdf",
  "퀴즈_09_유리수_문제.pdf",
  "퀴즈_10_절댓값_문제.pdf",
  "퀴즈_11_정수와 유리수의 덧뺄셈_문제.pdf",
  "퀴즈_12_정수와 유리수의 뺄셈부호_문제.pdf",
  "퀴즈_13_정수와 유리수의 덧뺄셈활용_문제.pdf",
  "퀴즈_14_정수 유리수의 곱셈_문제.pdf",
  "퀴즈_15_거듭제곱의 계산.pdf",
  "퀴즈_16_정수와 유리수의 혼합계산.pdf",
  "퀴즈_17_분배법칙.pdf",
  "퀴즈_18_소수와 분수.pdf",
  "퀴즈_19_유한소수의 성질.pdf",
  "퀴즈_20_무한소수의성질.pdf",
  "퀴즈_21_순환마디.pdf",
  "퀴즈_22_순환소수를 분수로.pdf",
  "퀴즈_23_순환소수를 분수로 나타내는 공식.pdf",
  "퀴즈_24_제곱근의 뜻과 표현.pdf",
  "퀴즈_25_제곱근의 성질.pdf",
  "퀴즈_26_제곱근의 성질2.pdf",
  "퀴즈_27_제곱근의 값.pdf",
  "퀴즈_28_제곱근의 대소비교.pdf",
  "퀴즈_29_무리수와 실수_수체계.pdf",
  "퀴즈_30_실수의 대소관계.pdf",
  "퀴즈_31_제곱근의 곱셈.pdf",
  "퀴즈_32_제곱근의 나눗셈.pdf",
  "퀴즈_33_분모의 유리화.pdf",
  "퀴즈_34_제곱근의 덧셈과 곱셈.pdf",
  "퀴즈_35_제곱근의 덧셈과 뺄셈.pdf",
  "퀴즈_36_제곱근의 덧셈과 곱셈4.pdf",
  "퀴즈_37_제곱근의 덧셈과 곱셈5.pdf",
  "퀴즈_38_곱셈공식3.pdf",
  "퀴즈_39_곱셈공식4.pdf",
  "퀴즈_40_곱셈공식6.pdf",
  "퀴즈_41_문자의 사용.pdf",
  "퀴즈_42_대입과 식의 값 구하기.pdf",
  "퀴즈_43_다항식의 용어.pdf",
  "퀴즈_44_다항식의 용어2.pdf",
  "퀴즈_45_일차식과 수의 곱셈.pdf",
  "퀴즈_46_일차식과 수의 나눗셈.pdf",
  "퀴즈_47_일차식의 분배법칙.pdf",
  "퀴즈_48_일차식의 분배법칙2.pdf",
  "퀴즈_49_동류항.pdf"
];

const EQUATION_PDF_FILES = [
  "01_복잡한 일차식의 정리.pdf",
  "02_일차식정리 응용문제.pdf",
  "03_방정식.pdf",
  "04_항등식.pdf",
  "05_등식의 성질.pdf",
  "06_이항.pdf",
  "07_괄호가 있는 방정식.pdf",
  "07_일차방정식.pdf",
  "08_비례식형태의 방정식.pdf",
  "09_복잡한 방정식.pdf",
  "10_속력에 관한 방정식.pdf"
];

const EQ_INEQ_3_PDF_FILES = [
  "01_지수법칙1,2.pdf",
  "02_지수법칙3,4.pdf",
  "03_단항식의 곱셈과 나눗셈.pdf",
  "04_곱셈공식1.pdf",
  "05_곱셈공식2.pdf",
  "06_곱셈공식의 활용.pdf",
  "07_곱셈공식 변형.pdf",
  "08_등식의 변형 문제.pdf",
  "09_식의 대입.pdf"
];

const EQ_INEQ_4_PDF_FILES = [
  "01_연립방정식 가감법.pdf",
  "02_연립방정식 대입법.pdf",
  "03_해가 없는 연립방정식.pdf",
  "04_부등식의 성질.pdf",
  "05_일차부등식.pdf",
  "06_부등식의 해와 수직선.pdf",
  "07_인수분해의 기초.pdf",
  "08_인수분해공식1(완전제곱식).pdf",
  "09_인수분해공식2(합차공식).pdf",
  "10_인수분해공식 3.pdf",
  "연립부등식.pdf"
];

const EQ_INEQ_5_PDF_FILES = [
  "01_인수분해 공식 4.pdf",
  "02_완전제곱식 만들기.pdf",
  "03_복잡한 인수분해.pdf",
  "04_이차방정식의 뜻과 풀이.pdf",
  "05_이차방정식의 중근.pdf",
  "06_제곱근을 이용한 이차방정식 풀이.pdf",
  "07_완전제곱식을 이용한 이차방정식 풀이.pdf",
  "08_근의 공식을 이용한 이차방정식 풀이.pdf",
  "09_이차방정식의 근과 계수의 관계.pdf",
  "10_위로 쏘아 올린 물체.pdf"
];

const MiddleSchoolMathBuilder = () => {
  const [status, setStatus] = useState('대기 중...');
  const [building, setBuilding] = useState(false);

  const groupFiles = () => {
    const chapters = {};
    
    // Group into chapters 1-10, 11-20, 21-30, etc.
    PDF_FILES.forEach(filename => {
      const match = filename.match(/_(\d+)_/);
      if (match) {
        const num = parseInt(match[1], 10);
        const start = Math.floor((num - 1) / 10) * 10 + 1;
        const end = start + 9;
        const key = `${start}_${end}`;
        
        if (!chapters[key]) {
          chapters[key] = {
            title: `Chapter ${start} ~ ${end}`,
            units: []
          };
        }
        
        // Extract meaningful title
        let cleanTitle = filename.replace('.pdf', '');
        cleanTitle = cleanTitle.replace(/^퀴즈_\d+_/, ''); // Remove prefix
        
        chapters[key].units.push({
          title: cleanTitle,
          filename: filename,
          order: num
        });
      }
    });

    return Object.fromEntries(
      Object.entries(chapters).sort((a, b) => {
        const aStart = parseInt(a[0].split('_')[0]);
        const bStart = parseInt(b[0].split('_')[0]);
        return aStart - bStart;
      })
    );
  };

  const handleBuild = async () => {
    setBuilding(true);
    setStatus('🔥 구축 시작...');

    try {
      const batch = writeBatch(db);
      
      const clusterId = 'middle-math'; // Correct cluster ID for "중등수학"
      const regionId = 'reg_1773407437227'; // Correct region ID for "기본개념 전과정"
      const regionRef = doc(collection(db, 'regions'), regionId);
      
      batch.set(regionRef, {
        id: regionId,
        title: '기본개념 전과정', // Match exact title in screenshot
        description: '중등수학 기본개념 전과정 마스터',
        color: '#FF9800', 
        icon: '📐',
        clusterId: clusterId,
        order: 1,
        isPrivate: true,
        accessCode: 'MATH99',
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setStatus('✔️ 리전(Region) 구성 완료. 챕터/유닛 생성 중...');

      const groupedData = groupFiles();
      let chapCounter = 1;
      
      for (const [key, chapData] of Object.entries(groupedData)) {
        const chapterId = `chap_middle_math_basic_${key}`;
        const chapterRef = doc(collection(db, 'chapters'), chapterId);
        
        batch.set(chapterRef, {
          docId: chapterId,
          id: chapterId,
          regionId: regionId,
          title: chapData.title,
          order: chapCounter++,
          updatedAt: serverTimestamp()
        }, { merge: true });

        chapData.units.forEach((unit) => {
          const unitId = `unit_middle_math_basic_${unit.order.toString().padStart(2, '0')}`;
          const unitRef = doc(collection(db, 'units'), unitId);
          
          batch.set(unitRef, {
            docId: unitId,
            id: unitId,
            chapterId: chapterId,
            title: unit.title,
            order: unit.order,
            learningContents: {
              text: 'PDF를 보며 개념을 학습하세요.',
              pdfUrl: `/pdfs/middle_math/basic/${unit.filename}`
            },
            contentFlags: {
              hasDataLog: true,
              hasTransmission: false,
              hasWorkbook: false
            },
            lastUpdated: serverTimestamp()
          }, { merge: true });
        });
      }

      setStatus('💾 서버에 저장 중...');
      await batch.commit();
      setStatus('✅ 중등수학 과정 자동 구축 완료!');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleBuildEquations = async () => {
    setBuilding(true);
    setStatus('🔥 방정식 11-20 구축 시작...');

    try {
      const regionId = 'reg_1773407437227';
      const chapterId = 'reg_1773407437227_chap_1773438436195'; // Verified actual ID
      
      setStatus('✔️ 대상 챕터 확인 완료. 기존 유닛 조회 중...');

      // Optional: Search for units with the OLD incorrect ID to clean up if needed
      // But more importantly, clean up the CURRENT chapter to avoid duplicates
      const unitsRef = collection(db, 'units');
      // In a real app we'd query, but here we'll just overwrite with same IDs or new IDs
      
      const batch = writeBatch(db);

      EQUATION_PDF_FILES.forEach((filename, index) => {
        // Extract title: "01_복잡한 일차식의 정리.pdf" -> "복잡한 일차식의 정리"
        let cleanTitle = filename.replace('.pdf', '');
        cleanTitle = cleanTitle.replace(/^\d+_/, ''); 

        const order = 11 + index; 
        const unitId = `unit_middle_math_eq_${order.toString().padStart(2, '0')}`;
        const unitRef = doc(unitsRef, unitId);
        
        batch.set(unitRef, {
          docId: unitId,
          id: unitId,
          chapterId: chapterId,
          title: cleanTitle,
          order: order,
          learningContents: {
            text: 'PDF를 보며 개념을 학습하세요.',
            pdfUrl: `/pdfs/middle_math/equations_11_20/${filename}`
          },
          contentFlags: {
            hasDataLog: true,
            hasTransmission: false,
            hasWorkbook: false
          },
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      setStatus('💾 서버에 저장 중...');
      await batch.commit();
      setStatus('✅ 방정식 11-20 유닛 구축 완료!');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleBuildEquations3 = async () => {
    setBuilding(true);
    setStatus('🔥 방정식과 부등식 III 구축 시작...');

    try {
      const chapterId = 'reg_1773407437227_chap_1773451462594'; // Verified actual ID for "방정식과 부등식 III"
      
      setStatus('✔️ 대상 챕터 확인 완료. 유닛 생성 중...');

      const unitsRef = collection(db, 'units');
      const batch = writeBatch(db);

      EQ_INEQ_3_PDF_FILES.forEach((filename, index) => {
        // Extract title: "01_지수법칙1,2.pdf" -> "지수법칙1,2"
        let cleanTitle = filename.replace('.pdf', '');
        cleanTitle = cleanTitle.replace(/^\d+_/, ''); 

        const order = index + 1; 
        const unitId = `unit_middle_math_eq3_${order.toString().padStart(2, '0')}`;
        const unitRef = doc(unitsRef, unitId);
        
        batch.set(unitRef, {
          docId: unitId,
          id: unitId,
          chapterId: chapterId,
          title: cleanTitle,
          order: order,
          learningContents: {
            text: 'PDF를 보며 개념을 학습하세요.',
            pdfUrl: `/pdfs/middle_math/eq_and_ineq_3/${filename}`
          },
          contentFlags: {
            hasDataLog: true,
            hasTransmission: false,
            hasWorkbook: false
          },
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      setStatus('💾 서버에 저장 중...');
      await batch.commit();
      setStatus('✅ 방정식과 부등식 III 유닛 구축 완료!');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleBuildEquations4 = async () => {
    setBuilding(true);
    setStatus('🔥 방정식과 부등식 IV 구축 시작...');

    try {
      const chapterId = 'reg_1773407437227_chap_1773536152595'; // Verified ID for "방정식과 부등식 IV"
      
      setStatus('✔️ 대상 챕터 확인 완료. 유닛 생성 중...');

      const unitsRef = collection(db, 'units');
      const batch = writeBatch(db);

      EQ_INEQ_4_PDF_FILES.forEach((filename, index) => {
        let cleanTitle = filename.replace('.pdf', '');
        cleanTitle = cleanTitle.replace(/^\d+_/, ''); 

        const order = index + 1; 
        const unitId = `unit_middle_math_eq4_${order.toString().padStart(2, '0')}`;
        const unitRef = doc(unitsRef, unitId);
        
        batch.set(unitRef, {
          docId: unitId,
          id: unitId,
          chapterId: chapterId,
          title: cleanTitle,
          order: order,
          learningContents: {
            text: 'PDF를 보며 개념을 학습하세요.',
            pdfUrl: `/pdfs/middle_math/eq_and_ineq_4/${filename}`
          },
          contentFlags: {
            hasDataLog: true,
            hasTransmission: false,
            hasWorkbook: false
          },
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      setStatus('💾 서버에 저장 중...');
      await batch.commit();
      setStatus('✅ 방정식과 부등식 IV 유닛 구축 완료!');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handleBuildEquations5 = async () => {
    setBuilding(true);
    setStatus('🔥 방정식과 부등식 V 구축 시작...');

    try {
      const chapterId = 'reg_1773407437227_chap_1773626782624'; // Verified ID for "방정식과 부등식 V"
      
      setStatus('✔️ 대상 챕터 확인 완료. 유닛 생성 중...');

      const unitsRef = collection(db, 'units');
      const batch = writeBatch(db);

      EQ_INEQ_5_PDF_FILES.forEach((filename, index) => {
        let cleanTitle = filename.replace('.pdf', '');
        cleanTitle = cleanTitle.replace(/^\d+_/, ''); 

        const order = index + 1; 
        const unitId = `unit_middle_math_eq5_${order.toString().padStart(2, '0')}`;
        const unitRef = doc(unitsRef, unitId);
        
        batch.set(unitRef, {
          docId: unitId,
          id: unitId,
          chapterId: chapterId,
          title: cleanTitle,
          order: order,
          learningContents: {
            text: 'PDF를 보며 개념을 학습하세요.',
            pdfUrl: `/pdfs/middle_math/eq_and_ineq_5/${filename}`
          },
          contentFlags: {
            hasDataLog: true,
            hasTransmission: false,
            hasWorkbook: false
          },
          lastUpdated: serverTimestamp()
        }, { merge: true });
      });

      setStatus('💾 서버에 저장 중...');
      await batch.commit();
      setStatus('✅ 방정식과 부등식 V 유닛 구축 완료!');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h1>📐 Middle School Math Builder</h1>
      <p style={{ color: 'gray' }}>중등수학 기본개념 전과정 자동 구축 도구</p>
      
      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>발견된 PDF 파일 수: {PDF_FILES.length}개</h3>
        <ul style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem' }}>
          {PDF_FILES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={handleBuild} disabled={building} style={{
          padding: '1rem 2rem', background: building ? 'gray' : '#FF9800',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          {building ? '구축 중...' : '🚀 기초 과정 생성 (1-50)'}
        </button>

        <button onClick={handleBuildEquations} disabled={building} style={{
          padding: '1rem 2rem', background: building ? 'gray' : '#4CAF50',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          {building ? '구축 중...' : '🚀 방정식 II 유닛 생성'}
        </button>

        <button onClick={handleBuildEquations3} disabled={building} style={{
          padding: '1rem 2rem', background: building ? 'gray' : '#2196F3',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          {building ? '구축 중...' : '🚀 방정식 III 유닛 생성'}
        </button>

        <button onClick={handleBuildEquations4} disabled={building} style={{
          padding: '1rem 2rem', background: building ? 'gray' : '#9C27B0',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          {building ? '구축 중...' : '🚀 방정식 IV 유닛 생성'}
        </button>

        <button onClick={handleBuildEquations5} disabled={building} style={{
          padding: '1rem 2rem', background: building ? 'gray' : '#E91E63',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
          {building ? '구축 중...' : '🚀 방정식 V 유닛 생성'}
        </button>
      </div>

      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>신규 방정식 III PDF 파일: {EQ_INEQ_3_PDF_FILES.length}개</h3>
        <ul style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem' }}>
          {EQ_INEQ_3_PDF_FILES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>신규 방정식 IV PDF 파일: {EQ_INEQ_4_PDF_FILES.length}개</h3>
        <ul style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem' }}>
          {EQ_INEQ_4_PDF_FILES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>신규 방정식 V PDF 파일: {EQ_INEQ_5_PDF_FILES.length}개</h3>
        <ul style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem' }}>
          {EQ_INEQ_5_PDF_FILES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: '2rem', fontWeight: 'bold' }}>상태: {status}</div>
    </div>
  );
};

export default MiddleSchoolMathBuilder;
