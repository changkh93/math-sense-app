import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const PDF_FILES = [
  "02_자료형과 변수_대화.pdf",
  "03_string(문자열) 자료_대화.pdf",
  "04_형변환, 인덱스, 슬라이싱_대화.pdf",
  "05_객체, 내장함수, 메소드_대화.pdf",
  "06_프린트 포맷팅_대화.pdf",
  "07_리스트 자료형_대화.pdf",
  "09_ list.append 활용, sum(), round()_대화.pdf",
  "10_for반복문_대화.pdf",
  "12_ for 중첩문, 별찍기, 구구단 출력_대화.pdf",
  "13_불리언_대화.pdf",
  "15_if조건문_대화.pdf",
  "16_집합_대화.pdf",
  "17_함수_대화.pdf",
  "18__args_대화.pdf",
  "20_class1_대화.pdf",
  "21_class2_대화.pdf",
  "24_turtle이용한 함수활용_대화.pdf",
  "27_while문_대화.pdf",
  "28_numby기초_대화.pdf",
  "30_racing_game_대화.pdf",
  "31_소수_판별_함수_대화.pdf",
  "32_소인수분해함수_대화.pdf",
  "33_약수, 공약수 구하기_대화.pdf",
  "34_유클리드호제법_대화.pdf",
  "35_최소공배수_대화.pdf",
  "37_밤하늘의별그리기_대화.pdf",
  "39_진법에관하여_대화.pdf",
  "41_class은행계좌_대화.pdf",
  "43_클래스로임의의자연수_대화.pdf",
  "44_클래스로 정수문제_대화.pdf",
  "45_클래스로 유리수 문제_대화.pdf",
  "46_list내포_대화.pdf",
  "47_numpy array생성_대화.pdf",
  "49_numby_2차원 배열_대화.pdf",
  "52_임의의 연리방벙식_대화.pdf",
  "56_임의의 부등식_대화.pdf",
  "57_tuple_zip함수_대화.pdf",
  "60_matplotlib_대화.pdf",
  "62_딕셔너리_대화.pdf",
  "63_ pandas Series_대화.pdf",
  "65_pandas DataFrame_대화.pdf",
  "67_plt_대화.pdf",
  "69_itertools 확률 _대화.pdf"
];

const PythonCourseBuilder = () => {
  const [status, setStatus] = useState('대기 중...');
  const [building, setBuilding] = useState(false);

  // Group files into chapters based on prefix numbers
  const groupFiles = () => {
    const chapters = {
      '1_10': { title: '기초 자료형과 제어문 (1 ~ 10)', units: [] },
      '11_20': { title: '함수와 클래스 기초 (11 ~ 20)', units: [] },
      '21_30': { title: '클래스와 모듈 응용 (21 ~ 30)', units: [] },
      '31_40': { title: '수학 알고리즘 (31 ~ 40)', units: [] },
      '41_50': { title: '클래스와 배열 (41 ~ 50)', units: [] },
      '51_60': { title: '방정식과 시각화 (51 ~ 60)', units: [] },
      '61_70': { title: '데이터 분석 기초 (61 ~ 70)', units: [] }
    };

    PDF_FILES.forEach(filename => {
      // Extract the leading number, e.g., "02", "15"
      const match = filename.match(/^(\d+)[_\s]/);
      if (match) {
        const num = parseInt(match[1], 10);
        const titleWithoutExtension = filename.replace('.pdf', '');
        
        // Clean up title
        let cleanTitle = titleWithoutExtension;
        cleanTitle = cleanTitle.replace(/^\d+[_\s]/, ''); // Remove leading number
        cleanTitle = cleanTitle.replace(/_대화_?\s*$/, ''); // Remove trailing _대화
        
        const unitData = {
          title: cleanTitle,
          filename: filename,
          order: num
        };

        if (num >= 1 && num <= 10) {
          chapters['1_10'].units.push(unitData);
        } else if (num >= 11 && num <= 20) {
          chapters['11_20'].units.push(unitData);
        } else if (num >= 21 && num <= 30) {
          chapters['21_30'].units.push(unitData);
        } else if (num >= 31 && num <= 40) {
          chapters['31_40'].units.push(unitData);
        } else if (num >= 41 && num <= 50) {
          chapters['41_50'].units.push(unitData);
        } else if (num >= 51 && num <= 60) {
          chapters['51_60'].units.push(unitData);
        } else if (num >= 61 && num <= 70) {
          chapters['61_70'].units.push(unitData);
        }
      }
    });

    // Sort units within chapters
    Object.values(chapters).forEach(chap => {
      chap.units.sort((a, b) => a.order - b.order);
    });

    return chapters;
  };

  const handleBuild = async () => {
    setBuilding(true);
    setStatus('🔥 구축 시작...');

    try {
      const batch = writeBatch(db);
      
      // 1. Create/Ensure Cluster (Use existing 'cluster_elementary' or create one)
      // Assuming cluster_elementary exists.
      
      // 2. Create Python Region for Math
      const regionId = 'reg_python_math';
      const regionRef = doc(collection(db, 'regions'), regionId);
      batch.set(regionRef, {
        id: regionId,
        title: '파이썬 수학',
        description: '파이썬으로 풀어보는 재미있는 수학 이야기',
        color: '#4CAF50', // Green for math/logic
        icon: '🔢',
        clusterId: 'python', // Updated to the actual cluster document ID for Python
        order: 102, // Put it at the end
        isPrivate: true, // Started private as requested generally for new regions
        accessCode: 'MATH24', // Default fixed code
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setStatus('✔️ 리전(Region) 구성 완료. 챕터/유닛 생성 중...');

      const groupedData = groupFiles();
      
      let chapOrder = 0;
      for (const [key, chapData] of Object.entries(groupedData)) {
        if (chapData.units.length === 0) continue;
        
        chapOrder += 1;
        const chapterId = `chap_py_math_${key}`;
        const chapterRef = doc(collection(db, 'chapters'), chapterId);
        
        batch.set(chapterRef, {
          docId: chapterId,
          id: chapterId,
          regionId: regionId,
          title: chapData.title,
          order: chapOrder,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Create Units
        chapData.units.forEach((unit, index) => {
          const unitId = `unit_py_math_${unit.order}`;
          const unitRef = doc(collection(db, 'units'), unitId);
          
          batch.set(unitRef, {
            docId: unitId,
            id: unitId,
            chapterId: chapterId,
            title: unit.title,
            order: unit.order,
            learningContents: {
              text: '',
              pdfUrl: `/pdfs/python/math/${unit.filename}` // Updated path
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

      setStatus('✅ 파이썬 수학 과정 자동 구축 완료! Content Manager에서 확인하세요.');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h1>🔢 Python Math Auto-Builder</h1>
      <p style={{ marginBottom: '2rem', color: 'gray' }}>
        이 도구는 <code>/public/pdfs/python/math</code> 폴더에 있는 파일들을 기반으로
        '파이썬 수학' (Region), 챕터(1~70), 그리고 개별 단원(Unit) 데이터를 Firestore에 한 번에 구축합니다.
      </p>

      <div style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>발견된 PDF 파일 수: {PDF_FILES.length}개</h3>
        <ul style={{ maxHeight: '200px', overflowY: 'auto', color: 'var(--crystal-cyan)', fontSize: '0.9rem' }}>
          {PDF_FILES.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>

      <button 
        onClick={handleBuild} 
        disabled={building}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          background: building ? 'gray' : 'var(--neon-blue)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: building ? 'not-allowed' : 'pointer'
        }}
      >
        {building ? '구축 진행 중...' : '🚀 파이썬 수학 과정 생성 시작'}
      </button>

      <div style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 'bold', color: status.includes('오류') ? 'red' : 'green' }}>
        상태: {status}
      </div>
    </div>
  );
};

export default PythonCourseBuilder;
