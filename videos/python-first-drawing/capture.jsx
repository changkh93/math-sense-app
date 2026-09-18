import React from 'react';import {createRoot} from 'react-dom/client';import PythonGameStudio from '../../src/components/PythonGameStudio/PythonGameStudio.jsx';import '../../src/index.css';
if(!import.meta.env.DEV)throw Error('Local capture only');
createRoot(document.getElementById('root')).render(<PythonGameStudio uid="marketing-turtle-20260918"/>);
