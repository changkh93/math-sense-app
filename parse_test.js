const parseInlineFormatting = (text) => {
  if (!text) return text;
  
  // To handle **$a$**, we need to parse bold first, then math inside bold!
  
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((bPart, bIndex) => {
    if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
      const innerBold = bPart.slice(2, -2);
      // parse inner for math
      const mathParts = innerBold.split(/(\$.*?\$)/g);
      const innerContent = mathParts.map((mPart, mIndex) => {
          if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
              return `<InlineMath math="${mPart.slice(1, -1)}" />`;
          }
          return mPart;
      }).join('');
      return `<strong>${innerContent}</strong>`;
    }
    
    // Not bold, check math
    const mathParts = bPart.split(/(\$.*?\$)/g);
    return mathParts.map((mPart, mIndex) => {
        if (mPart.startsWith('$') && mPart.endsWith('$') && mPart.length >= 2) {
            return `<InlineMath math="${mPart.slice(1, -1)}" />`;
        }
        
        // Not math, check italic
        const italicParts = mPart.split(/(\*[^*]+\*)/g);
        return italicParts.map((iPart, iIndex) => {
            if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
                return `<em>${iPart.slice(1, -1)}</em>`;
            }
            return iPart;
        }).join('');
    }).join('');
  }).join('');
};

console.log(parseInlineFormatting("**$a$ 대 $b$**"));
console.log(parseInlineFormatting("$a$ is to $b$ / $a$ to $b$"));
