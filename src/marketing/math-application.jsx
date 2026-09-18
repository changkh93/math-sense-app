import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import PublicApplication from '../pages/PublicApplication.jsx';
import './math-application.css';
const target=document.getElementById('math-application');
if(target)createRoot(target).render(<MemoryRouter><PublicApplication fixedType="trial" initialCourse="수학과 고전읽기" /></MemoryRouter>);
