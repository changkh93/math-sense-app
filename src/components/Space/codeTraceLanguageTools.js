import { studioCompletion } from '../PythonWorld/studioCompletion.js';
import { studioSpelling } from '../PythonWorld/studioSpelling.js';

export const CODE_TRACE_COMPLETION_PROJECT = Object.freeze({ path: 'main.py', files: [] });

export function codeTraceLanguageTools(getProject = () => CODE_TRACE_COMPLETION_PROJECT) {
  return [
    ...studioCompletion(getProject, { strictPrefix: true }),
    ...studioSpelling(getProject),
  ];
}
