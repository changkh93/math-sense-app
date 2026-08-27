const assert = require("node:assert/strict");
const test = require("node:test");
const {
  normalizeCode,
  hashCode,
  activeCourseIds,
  activeRegionIds,
  buildAccessClaims,
  applyAccessState,
} = require("./accessControl.cjs").testables;

test("access codes are normalized before hashing", () => {
  assert.equal(normalizeCode(" ab c-12 "), "ABC-12");
  assert.equal(hashCode("abc-12"), hashCode(" AB C-12 "));
});

test("only active clusters enter the compact token claim", () => {
  const access = {
    cluster_middle: "active",
    cluster_python: "suspended",
    cluster_elementary: "active",
  };
  assert.deepEqual(activeCourseIds(access), ["cluster_elementary", "cluster_middle"]);
  assert.deepEqual(activeRegionIds({ r1: "active", r2: "completed", r3: "suspended" }), ["r1", "r2"]);
  assert.deepEqual(buildAccessClaims({ admin: false }, access, { r1: "active", r2: "completed" }), {
    admin: false,
    courses: ["cluster_elementary", "cluster_middle"],
    regions: ["r1", "r2"],
    accessVersion: 1,
  });
});

test("access state updates are immutable and validate state", () => {
  const before = { cluster_elementary: "active" };
  const after = applyAccessState(before, "cluster_middle", "active", new Set(["none", "active"]));
  assert.deepEqual(before, { cluster_elementary: "active" });
  assert.deepEqual(after, { cluster_elementary: "active", cluster_middle: "active" });
  assert.deepEqual(applyAccessState(after, "cluster_middle", "none", new Set(["none", "active"])), {
    cluster_elementary: "active",
  });
  assert.throws(() => applyAccessState(before, "cluster_middle", "admin", new Set(["none", "active"])));
});

test("claims reject oversized access payloads", () => {
  const access = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [
    `cluster_${index}_${"x".repeat(20)}`,
    "active",
  ]));
  assert.throws(() => buildAccessClaims({}, access), /too large/);
});
