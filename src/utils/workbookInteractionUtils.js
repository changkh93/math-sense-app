export const WORKBOOK_INTERACTION_TYPES = new Set([
  'grouping',
  'number-line',
  'matching',
  'ordering',
  'coloring',
]);

export const WORKBOOK_GRADABLE_TYPES = new Set([
  'input',
  'multiple-choice',
  ...WORKBOOK_INTERACTION_TYPES,
]);

const cleanId = (value, fallback) => {
  const cleaned = String(value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 50);
  return cleaned || fallback;
};

const normalizeItems = (items, label, { min = 1, max = 30 } = {}) => {
  if (!Array.isArray(items) || items.length < min || items.length > max) {
    throw new Error(`${label}은(는) ${min}~${max}개여야 합니다.`);
  }
  const used = new Set();
  return items.map((rawItem, index) => {
    const item = typeof rawItem === 'object' && rawItem !== null ? rawItem : { label: rawItem };
    const id = cleanId(item.id, `item_${index + 1}`);
    if (used.has(id)) throw new Error(`${label}의 id가 중복되었습니다: ${id}`);
    used.add(id);
    return { id, label: String(item.label ?? id).trim().slice(0, 80) || id };
  });
};

const requireExactKeys = (answer, expectedIds, label) => {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    throw new Error(`${label} 정답은 id를 키로 사용하는 객체여야 합니다.`);
  }
  expectedIds.forEach((id) => {
    if (answer[id] === undefined || answer[id] === null || answer[id] === '') {
      throw new Error(`${label} 정답에 ${id} 항목이 없습니다.`);
    }
  });
};

export const getDefaultInteractionConfig = (type) => {
  if (type === 'grouping') return {
    items: [{ id: 'item_1', label: '1' }, { id: 'item_2', label: '2' }],
    groups: [{ id: 'group_1', label: '그룹 1' }, { id: 'group_2', label: '그룹 2' }],
    answer: { item_1: 'group_1', item_2: 'group_2' },
  };
  if (type === 'number-line') return { min: 0, max: 10, step: 1, answer: 5 };
  if (type === 'matching') return {
    leftItems: [{ id: 'left_1', label: '1' }, { id: 'left_2', label: '2' }],
    rightItems: [{ id: 'right_1', label: '가' }, { id: 'right_2', label: '나' }],
    answer: { left_1: 'right_1', left_2: 'right_2' },
  };
  if (type === 'ordering') return {
    items: [{ id: 'item_1', label: '1' }, { id: 'item_2', label: '2' }, { id: 'item_3', label: '3' }],
    answer: ['item_1', 'item_2', 'item_3'],
  };
  if (type === 'coloring') return {
    cells: [{ id: 'cell_1', label: '1' }, { id: 'cell_2', label: '2' }],
    colors: [{ id: 'red', label: '빨강', value: '#ef4444' }, { id: 'blue', label: '파랑', value: '#3b82f6' }],
    answer: { cell_1: 'red', cell_2: 'blue' },
  };
  return {};
};

export const normalizeInteractionConfig = (type, rawConfig) => {
  const config = rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig) ? rawConfig : {};

  if (type === 'grouping') {
    const items = normalizeItems(config.items, '나누기 항목', { min: 2 });
    const groups = normalizeItems(config.groups, '나누기 그룹', { min: 2, max: 10 });
    requireExactKeys(config.answer, items.map(item => item.id), '나누기');
    const groupIds = new Set(groups.map(group => group.id));
    const answer = Object.fromEntries(items.map(item => {
      const groupId = String(config.answer[item.id]);
      if (!groupIds.has(groupId)) throw new Error(`나누기 정답의 그룹이 존재하지 않습니다: ${groupId}`);
      return [item.id, groupId];
    }));
    return { items, groups, answer };
  }

  if (type === 'number-line') {
    const min = Number(config.min);
    const max = Number(config.max);
    const step = Number(config.step);
    const answer = Number(config.answer);
    if (![min, max, step, answer].every(Number.isFinite)) throw new Error('수직선 min, max, step, answer는 숫자여야 합니다.');
    if (max <= min || step <= 0 || (max - min) / step > 30) throw new Error('수직선 범위와 간격을 확인해주세요. 눈금은 최대 31개입니다.');
    if (Math.abs((max - min) / step - Math.round((max - min) / step)) > 1e-8) throw new Error('수직선의 범위는 step 간격으로 정확히 나누어져야 합니다.');
    const tickIndex = (answer - min) / step;
    if (answer < min || answer > max || Math.abs(tickIndex - Math.round(tickIndex)) > 1e-8) {
      throw new Error('수직선 정답은 표시되는 눈금 중 하나여야 합니다.');
    }
    return { min, max, step, answer };
  }

  if (type === 'matching') {
    const leftItems = normalizeItems(config.leftItems, '연결 왼쪽 항목', { min: 2, max: 15 });
    const rightItems = normalizeItems(config.rightItems, '연결 오른쪽 항목', { min: 2, max: 15 });
    requireExactKeys(config.answer, leftItems.map(item => item.id), '연결');
    const rightIds = new Set(rightItems.map(item => item.id));
    const answer = Object.fromEntries(leftItems.map(item => {
      const rightId = String(config.answer[item.id]);
      if (!rightIds.has(rightId)) throw new Error(`연결 정답의 오른쪽 항목이 존재하지 않습니다: ${rightId}`);
      return [item.id, rightId];
    }));
    return { leftItems, rightItems, answer };
  }

  if (type === 'ordering') {
    const items = normalizeItems(config.items, '정렬 항목', { min: 2, max: 15 });
    const answer = Array.isArray(config.answer) ? config.answer.map(String) : [];
    const itemIds = items.map(item => item.id);
    if (answer.length !== itemIds.length || new Set(answer).size !== itemIds.length || answer.some(id => !itemIds.includes(id))) {
      throw new Error('정렬 정답에는 모든 항목 id가 한 번씩 들어가야 합니다.');
    }
    const requestedInitial = Array.isArray(config.initialOrder) ? config.initialOrder.map(String) : itemIds;
    const validInitial = requestedInitial.length === itemIds.length
      && new Set(requestedInitial).size === itemIds.length
      && requestedInitial.every(id => itemIds.includes(id));
    let initialOrder = validInitial ? requestedInitial : itemIds;
    if (initialOrder.every((id, index) => id === answer[index])) initialOrder = [...initialOrder].reverse();
    return { items, answer, initialOrder };
  }

  if (type === 'coloring') {
    const cells = normalizeItems(config.cells, '색칠 칸', { min: 1, max: 30 });
    const colors = normalizeItems(config.colors, '색상', { min: 1, max: 10 }).map((color, index) => ({
      ...color,
      value: String(config.colors[index]?.value || '#22d3ee').slice(0, 30),
    }));
    requireExactKeys(config.answer, cells.map(cell => cell.id), '색칠');
    const colorIds = new Set(colors.map(color => color.id));
    const answer = Object.fromEntries(cells.map(cell => {
      const colorId = String(config.answer[cell.id]);
      if (!colorIds.has(colorId)) throw new Error(`색칠 정답의 색상이 존재하지 않습니다: ${colorId}`);
      return [cell.id, colorId];
    }));
    return { cells, colors, answer };
  }

  throw new Error(`지원하지 않는 인터랙션 type입니다: ${type}`);
};

const sameRecord = (actual, expected) => Object.keys(expected).every(key => String(actual?.[key] ?? '') === String(expected[key]));

export const evaluateWorkbookInteraction = (element, response) => {
  const config = element?.config || {};
  if (element?.type === 'number-line') return Number(response) === Number(config.answer);
  if (element?.type === 'ordering') {
    return Array.isArray(response)
      && response.length === config.answer?.length
      && config.answer.every((id, index) => response[index] === id);
  }
  if (['grouping', 'matching', 'coloring'].includes(element?.type)) return sameRecord(response, config.answer || {});
  return false;
};

export const getInitialWorkbookInteractionResponse = (element) => {
  if (element?.type === 'ordering') return element.config?.initialOrder || (element.config?.items || []).map(item => item.id).reverse();
  if (['grouping', 'matching', 'coloring'].includes(element?.type)) return {};
  return '';
};

export const recommendWorkbookInteraction = ({ sourceText = '' } = {}) => {
  const text = String(sourceText).replace(/\s+/g, ' ');
  let type = 'input';
  let reason = '짧은 답을 직접 쓰는 문제가 가장 적합합니다.';
  if (/(수직선|눈금|어디에|위치)/.test(text)) {
    type = 'number-line'; reason = '수직선·눈금 위치를 묻는 표현을 찾았습니다.';
  } else if (/(연결|짝|같은 것|대응)/.test(text)) {
    type = 'matching'; reason = '서로 대응하는 대상을 연결하는 문제로 판단했습니다.';
  } else if (/(순서|작은 수부터|큰 수부터|차례)/.test(text)) {
    type = 'ordering'; reason = '순서나 크기 비교가 핵심인 문제로 판단했습니다.';
  } else if (/(색칠|색으로|칠하세요)/.test(text)) {
    type = 'coloring'; reason = '영역을 선택해 색칠하는 활동으로 판단했습니다.';
  } else if (/(똑같이 나누|묶|분류|모둠|그룹)/.test(text)) {
    type = 'grouping'; reason = '대상을 나누거나 묶는 조작 활동으로 판단했습니다.';
  }
  return { type, reason };
};

export const getAdaptiveWorkbookHintState = (element, studentProfile = {}, wrongAttemptCount = 1) => {
  const stagedHints = Array.isArray(element?.hints) ? element.hints.filter(Boolean) : [];
  const suppliedHints = stagedHints.length ? stagedHints : (element?.hint ? [element.hint] : []);
  const openingHint = element?.type === 'multiple-choice'
    ? '각 선택지가 문제의 조건과 맞는지 하나씩 비교해 보세요.'
    : '문제에서 알고 있는 수와 구하려는 것을 먼저 찾아보세요.';
  const hints = suppliedHints.length === 1 && suppliedHints[0] !== openingHint
    ? [openingHint, suppliedHints[0]]
    : suppliedHints;
  const averageScore = Number(studentProfile.workbookAverageScore ?? 70);
  if (hints.length) {
    const attemptIndex = Math.max(0, Number(wrongAttemptCount || 1) - 1);
    const supportOffset = averageScore < 70 && hints.length >= 3 ? 1 : 0;
    const index = Math.min(attemptIndex + supportOffset, hints.length - 1);
    return { text: hints[index], level: index + 1, total: hints.length };
  }
  const generic = {
    grouping: '한 항목씩 옮긴 뒤 각 그룹의 개수가 조건에 맞는지 세어 보세요.',
    'number-line': '시작 수에서 눈금 한 칸의 크기만큼 차례로 이동해 보세요.',
    matching: '한쪽 항목을 고른 뒤 같은 뜻이나 값을 가진 항목을 찾아보세요.',
    ordering: '가장 작거나 가장 큰 항목을 먼저 찾은 뒤 양옆 화살표로 옮겨 보세요.',
    coloring: '조건에 해당하는 칸과 사용할 색을 하나씩 다시 확인해 보세요.',
  };
  return {
    text: generic[element?.type] || '문제의 조건과 선택한 답을 차례로 다시 확인해 보세요.',
    level: 1,
    total: 1,
  };
};

export const getAdaptiveWorkbookHint = (element, studentProfile = {}, wrongAttemptCount = 1) => (
  getAdaptiveWorkbookHintState(element, studentProfile, wrongAttemptCount).text
);
