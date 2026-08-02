// Server-side validation traits for the append-only Astra Builder recipe catalog.
// Keep this file dependency-free so callable functions can validate client payloads
// without importing the browser-side catalog bundle.

const ASTRA_BUILDER_CATALOG_VERSION = 2;
const ASTRA_BUILDER_ENCODING_V1 = "u16le-v1";
const ASTRA_BUILDER_ENCODING_V2 = "u32le-v2";

const ASTRA_BUILDER_RECIPE_TRAITS = new Map();

function add(ids, legacyBlockType, rotationSteps) {
  ids.forEach((id) => {
    ASTRA_BUILDER_RECIPE_TRAITS.set(id, { legacyBlockType, rotationSteps });
  });
}

add([1, 9, 10, 11, 16, 17, 18, 19], 1, 1);
add([2, 12, 13, 14, 15], 2, 1);
add([3, 22, 23], 3, 1);
add([4, 24, 25, 26, 27], 4, 1);
add([5, 20], 5, 4);
add([6, 21], 6, 1);
add([7], 7, 4);
add([8], 8, 1);

const ASTRA_BUILDER_ALLOWED_RECIPE_IDS = new Set(ASTRA_BUILDER_RECIPE_TRAITS.keys());

module.exports = {
  ASTRA_BUILDER_CATALOG_VERSION,
  ASTRA_BUILDER_ENCODING_V1,
  ASTRA_BUILDER_ENCODING_V2,
  ASTRA_BUILDER_RECIPE_TRAITS,
  ASTRA_BUILDER_ALLOWED_RECIPE_IDS,
};
