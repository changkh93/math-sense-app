import React from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { parseInlineFormatting, sanitizeLaTeX } from '../../utils/formatUtils';
import {
  isWorkbookMathDisplayValue,
  normalizeWorkbookMathForKatex,
  parseWorkbookSimpleFraction,
} from '../../utils/workbookMathDisplayUtils';

const WorkbookChoiceContent = ({ value, keyPrefix = 'choice' }) => {
  if (!isWorkbookMathDisplayValue(value)) {
    const str = String(value || '');
    if (str.includes('\n')) {
      const lines = str.split('\n');
      return (
        <div className="workbook-choice-stacked" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', lineHeight: 1.15, letterSpacing: '0.12em' }}>
          {lines.map((line, lIdx) => (
            <div key={`${keyPrefix}-line-${lIdx}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {parseInlineFormatting(line, { keyPrefix: `${keyPrefix}-l-${lIdx}` })}
            </div>
          ))}
        </div>
      );
    }
    return parseInlineFormatting(value, { keyPrefix });
  }

  const simpleFraction = parseWorkbookSimpleFraction(value);
  if (simpleFraction) {
    const renderFractionPart = (part) => part.mode === 'text'
      ? <span className="workbook-choice-simple-fraction-text">{part.value}</span>
      : (
        <InlineMath
          math={sanitizeLaTeX(part.value)}
          renderError={() => <span className="workbook-choice-math-fallback">{part.value}</span>}
        />
      );
    return (
      <span
        className="workbook-choice-simple-fraction"
        aria-label={`분자 ${simpleFraction.numerator.value}, 분모 ${simpleFraction.denominator.value}`}
      >
        <span className="workbook-choice-simple-fraction-numerator">{renderFractionPart(simpleFraction.numerator)}</span>
        <span className="workbook-choice-simple-fraction-denominator">{renderFractionPart(simpleFraction.denominator)}</span>
      </span>
    );
  }

  const math = sanitizeLaTeX(normalizeWorkbookMathForKatex(value));
  const mathDensity = math.length > 90 ? 'dense' : (math.length > 45 ? 'compact' : 'normal');
  return (
    <span className={`workbook-choice-math ${mathDensity}`} aria-label={String(value)}>
      <BlockMath
        math={math}
        renderError={() => <span className="workbook-choice-math-fallback">수식을 표시할 수 없습니다.</span>}
      />
    </span>
  );
};

export default WorkbookChoiceContent;
