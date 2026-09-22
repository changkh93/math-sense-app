/**
 * Align two line-key sequences with edit-distance semantics.
 *
 * A changed line is one substitution, not a misleading missing+extra pair.
 * Exact matches after an inserted/deleted line are still re-synchronised.
 */
export function alignCodeTraceLineKeys(answerKeys = [], studentKeys = []) {
  const answerLength = answerKeys.length;
  const studentLength = studentKeys.length;
  const costs = Array.from(
    { length: answerLength + 1 },
    () => Array(studentLength + 1).fill(0),
  );

  for (let answerIndex = answerLength; answerIndex >= 0; answerIndex -= 1) {
    costs[answerIndex][studentLength] = answerLength - answerIndex;
  }
  for (let studentIndex = studentLength; studentIndex >= 0; studentIndex -= 1) {
    costs[answerLength][studentIndex] = studentLength - studentIndex;
  }

  for (let answerIndex = answerLength - 1; answerIndex >= 0; answerIndex -= 1) {
    for (let studentIndex = studentLength - 1; studentIndex >= 0; studentIndex -= 1) {
      if (answerKeys[answerIndex] === studentKeys[studentIndex]) {
        costs[answerIndex][studentIndex] = costs[answerIndex + 1][studentIndex + 1];
        continue;
      }
      costs[answerIndex][studentIndex] = 1 + Math.min(
        costs[answerIndex + 1][studentIndex + 1],
        costs[answerIndex + 1][studentIndex],
        costs[answerIndex][studentIndex + 1],
      );
    }
  }

  const pairs = [];
  let answerIndex = 0;
  let studentIndex = 0;
  while (answerIndex < answerLength && studentIndex < studentLength) {
    if (answerKeys[answerIndex] === studentKeys[studentIndex]) {
      pairs.push({ answerIndex, studentIndex });
      answerIndex += 1;
      studentIndex += 1;
      continue;
    }

    const substitutionCost = 1 + costs[answerIndex + 1][studentIndex + 1];
    const deletionCost = 1 + costs[answerIndex + 1][studentIndex];
    const insertionCost = 1 + costs[answerIndex][studentIndex + 1];

    // Prefer a substitution on ties. This keeps one edited line together instead
    // of reporting it twice as a missing line and an extra line.
    if (substitutionCost <= deletionCost && substitutionCost <= insertionCost) {
      pairs.push({ answerIndex, studentIndex });
      answerIndex += 1;
      studentIndex += 1;
    } else if (deletionCost <= insertionCost) {
      pairs.push({ answerIndex, studentIndex: -1 });
      answerIndex += 1;
    } else {
      pairs.push({ answerIndex: -1, studentIndex });
      studentIndex += 1;
    }
  }

  while (answerIndex < answerLength) {
    pairs.push({ answerIndex, studentIndex: -1 });
    answerIndex += 1;
  }
  while (studentIndex < studentLength) {
    pairs.push({ answerIndex: -1, studentIndex });
    studentIndex += 1;
  }

  return pairs;
}
