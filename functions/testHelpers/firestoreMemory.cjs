const assert = require('node:assert/strict');
const copy = (v) => Array.isArray(v) ? v.map(copy) : v && v.constructor === Object
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)])) : v;
const get = (data, path) => path.split('.').reduce((v, k) => v?.[k], data);
function merge(base, patch) {
  const result = copy(base || {});
  for (const [key, value] of Object.entries(patch)) {
    if (value?.constructor?.name === 'NumericIncrementTransform') result[key] = (result[key] || 0) + value.operand;
    else if (value?.constructor?.name === 'ServerTimestampTransform') result[key] = new Date();
    else if (value?.constructor === Object) result[key] = merge(result[key], value);
    else result[key] = copy(value);
  }
  return result;
}
module.exports = function memoryFirestore(initial = {}) {
  const data = new Map(Object.entries(copy(initial)));
  const snap = (ref) => ({ id: ref.id, ref, exists: data.has(ref.path), data: () => copy(data.get(ref.path)) });
  function collection(path, filters = []) {
    return {
      path, filters,
      doc: (id) => ({ path: `${path}/${id}`, id, get: async function () { return snap(this); } }),
      where: (key, op, value) => collection(path, [...filters, { key, op, value }]),
      get: async function () {
        const docs = [...data.keys()].filter((key) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1)
          .filter((key) => filters.every((f) => f.op === '==' && get(data.get(key), f.key) === f.value))
          .map((key) => snap({ path: key, id: key.split('/').at(-1) }));
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  let queue = Promise.resolve();
  return {
    data, collection, writes: 0,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (ref) => { assert.equal(writes.length, 0, 'Firestore prohibits reads after writes'); return ref.get(); },
          set: (ref, value, opts) => writes.push({ ref, value, merge: opts?.merge }),
          create: (ref, value) => { assert.equal(data.has(ref.path), false); writes.push({ ref, value }); },
          update: (ref, value) => writes.push({ ref, value, update: true }),
        };
        const result = await callback(tx);
        for (const w of writes) {
          if (w.update) {
            assert.ok(data.has(w.ref.path));
            const row = copy(data.get(w.ref.path));
            for (const [path, value] of Object.entries(w.value)) {
              const parts = path.split('.'); const last = parts.pop(); let cursor = row;
              for (const part of parts) cursor = cursor[part] ||= {};
              cursor[last] = copy(value);
            }
            data.set(w.ref.path, row);
          } else data.set(w.ref.path, merge(w.merge ? data.get(w.ref.path) : {}, w.value));
        }
        this.writes += writes.length;
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
};
