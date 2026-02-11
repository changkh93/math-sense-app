/**
 * Sanitizes LaTeX strings to handle common JS escaping issues.
 * Specifically handles the case where \frac becomes [Form Feed]rac (\f + rac)
 */
export const sanitizeLaTeX = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace the Form Feed character (\u000c) with \f, but then specifically handle \frac
  // If we find \u000c followed by 'rac', it's almost certainly a corrupted \frac
  return text
    .replace(/\u000c/g, '\\f') 
    .replace(/\\frac/g, '\\frac'); // Ensure it stays as \frac for KaTeX
};
