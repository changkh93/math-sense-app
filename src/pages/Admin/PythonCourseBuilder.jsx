import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const PDF_FILES = [
  "02_문자열, 숫자형 자료 구분_대화.pdf",
  "03_Turtle 시작_대화.pdf",
  "04_정삼각형 그리기_대화.pdf",
  "05_T자그리기_대화.pdf",
  "06_pensize, color 지정하기_대화.pdf",
  "07_goto(),penup(), pendown()_대화 .pdf",
  "08_배경색, 색 채우기_대화.pdf",
  "09_for 반복문, list형 자료_대화.pdf",
  "10_다양한 색 그리기(for 반복문 활용)_대화.pdf",
  "11_원 그리기, circle_대화.pdf",
  "12_이중 for문_대화.pdf",
  "13_이중 for문으로 별 움직임 그리기_대화.pdf",
  "14_이중 for문으로 다양한 모양 시도하기_대화.pdf",
  "15_삼중 for문으로 도형 회전시키기_대화.pdf",
  "16_프랑스 국기, 올림픽기 그리기_대화.pdf",
  "17_함수 이해하기_대화.pdf",
  "18_ input(), 자료형변환 이해하기_대화.pdf",
  "20_함수를 이용해 창문 그리기, window()_대화.pdf",
  "21_불리언, 비교연산자_대화.pdf",
  "22_if문 활용하여 도형그리기_대화.pdf",
  "25_집그리기 완성_대화.pdf",
  "27_race game 완성_대화.pdf"
];

const PythonCourseBuilder = () => {
  const [status, setStatus] = useState('대기 중...');
  const [building, setBuilding] = useState(false);

  // Group files into chapters based on prefix numbers
  const groupFiles = () => {
    const chapters = {
      '1_10': { title: '1 ~ 10', units: [] },
      '11_20': { title: '11 ~ 20', units: [] },
      '21_30': { title: '21 ~ 27', units: [] }
    };

    PDF_FILES.forEach(filename => {
      // Extract the leading number, e.g., "02", "15"
      const match = filename.match(/^(\d+)_/);
      if (match) {
        const num = parseInt(match[1], 10);
        const titleWithoutExtension = filename.replace('.pdf', '');
        
        // Clean up title (remove '02_', '_대화' if preferred, but let's keep it simple or just remove the prefix/suffix)
        let cleanTitle = titleWithoutExtension;
        cleanTitle = cleanTitle.replace(/^\d+_/, ''); // Remove leading number
        cleanTitle = cleanTitle.replace(/_대화\s*$/, ''); // Remove trailing _대화
        
        const unitData = {
          title: cleanTitle,
          filename: filename,
          order: num
        };

        if (num >= 1 && num <= 10) {
          chapters['1_10'].units.push(unitData);
        } else if (num >= 11 && num <= 20) {
          chapters['11_20'].units.push(unitData);
        } else if (num >= 21) {
          chapters['21_30'].units.push(unitData);
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
      
      // 2. Create Python Region
      const regionId = 'reg_python_course';
      const regionRef = doc(collection(db, 'regions'), regionId);
      batch.set(regionRef, {
        id: regionId,
        title: '처음 파이썬',
        description: '파이썬의 세계로 떠나는 즐거운 코딩 탐험',
        color: '#FFA500', // Orange-ish matching python? Or maybe #F9A826
        icon: '💻',
        clusterId: 'python', // Updated to the actual cluster document ID for Python
        order: 99, // Put it at the end for now
        isPrivate: true, // Started private as requested generally for new regions
        accessCode: 'PYTHON24', // Default fixed code
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setStatus('✔️ 리전(Region) 구성 완료. 챕터/유닛 생성 중...');

      const groupedData = groupFiles();
      
      let chapOrder = 0;
      for (const [key, chapData] of Object.entries(groupedData)) {
        if (chapData.units.length === 0) continue;
        
        chapOrder += 1;
        const chapterId = `chap_python_${key}`;
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
          const unitId = `unit_python_${unit.order}`;
          const unitRef = doc(collection(db, 'units'), unitId);
          
          batch.set(unitRef, {
            docId: unitId,
            id: unitId,
            chapterId: chapterId,
            title: unit.title,
            order: unit.order,
            learningContents: {
              text: '',
              pdfUrl: `/pdfs/python/${unit.filename}`
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

      setStatus('✅ 파이썬 과정 자동 구축 완료! Content Manager에서 확인하세요.');
    } catch (err) {
      console.error(err);
      setStatus(`❌ 오류 발생: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h1>🛠️ Python Course Auto-Builder</h1>
      <p style={{ marginBottom: '2rem', color: 'gray' }}>
        이 도구는 <code>/public/pdfs/python</code> 폴더에 있는 파이썬 교재 PDF를 기반으로
        '처음 파이썬' (Region), 챕터(1~10, ...), 그리고 개별 단원(Unit) 데이터를 Firestore에 한 번에 구축합니다.
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
        {building ? '구축 진행 중...' : '🚀 파이썬 과정 자동 생성 시작'}
      </button>

      <div style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 'bold', color: status.includes('오류') ? 'red' : 'green' }}>
        상태: {status}
      </div>
    </div>
  );
};

export default PythonCourseBuilder;
