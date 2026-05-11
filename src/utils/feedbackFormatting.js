const SECTION_MARKERS = [
  '과제 피드백',
  '잘한 점',
  '이전보다 좋아진 점',
  '더 발전시키면 좋은 점',
  '다음 미션',
  '학습 성과 분석',
  '학습 지표 코멘트',
  '보완하면 좋은 점',
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitSentences(value) {
  return value.match(/[^.!?\n]+[.!?]+["')\]]*|[^.!?\n]+$/g) || [value];
}

function splitLongParagraph(paragraph) {
  if (paragraph.length <= 240 || paragraph.includes('\n')) {
    return paragraph;
  }

  const sentences = splitSentences(paragraph).map(sentence => sentence.trim()).filter(Boolean);
  if (sentences.length <= 1) {
    return paragraph;
  }

  const groups = [];
  let current = '';
  let sentenceCount = 0;

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && (next.length > 230 || sentenceCount >= 2)) {
      groups.push(current);
      current = sentence;
      sentenceCount = 1;
    } else {
      current = next;
      sentenceCount += 1;
    }
  });

  if (current) groups.push(current);
  return groups.join('\n\n');
}

export function formatFeedbackForDisplay(rawFeedback) {
  if (!rawFeedback) return '';

  let text = String(rawFeedback)
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return '';

  const alreadyStructured = /\n\s*(#{1,6}\s|\d{1,2}\.\s|[-*]\s)/.test(text) || /\n{2,}/.test(text);

  if (!alreadyStructured) {
    text = text.replace(/\s+(\d{1,2}\.\s+)/g, '\n\n$1');

    SECTION_MARKERS.forEach((marker) => {
      const markerPattern = new RegExp(`\\s+(${escapeRegExp(marker)}\\s*[:：])`, 'g');
      text = text.replace(markerPattern, (match, heading, offset, source) => {
        const prefix = source.slice(Math.max(0, offset - 3), offset + 1);
        if (/\d\.\s$/.test(prefix)) return match;
        return `\n\n${heading}`;
      });
    });
  }

  return text
    .split(/\n{2,}/)
    .map(part => splitLongParagraph(part.trim()))
    .filter(Boolean)
    .join('\n\n');
}
