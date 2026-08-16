/**
 * Western Classic Navigation Policy & Constants
 * Defines the strict 7-planet entry points for the western-classic cluster:
 * 1. Astra Frontier (Special)
 * 2. Assignment Hub / Stellar Archive (Special)
 * 3. Dark Matter (Special)
 * 4. Reading Bookshelf & Archive / Reading Library (Special)
 * 5. Neverland Classic (Firestore Region: reg_1776154036888)
 * 6. Western Classic Reading (Firestore Region: reg_1776158746744)
 * 7. Nobel Prize Winners (Firestore Region: reg_1776240768916)
 */

export const WESTERN_CLASSIC_CLUSTER_IDS = new Set([
  'western-classic',
  '서양고전',
  '서양고전읽기',
  'classic',
  'classics'
]);

export const WESTERN_CLASSIC_CANONICAL_CLUSTER_ID = 'western-classic';

export const WESTERN_CLASSIC_REGION_IDS = new Set([
  'reg_1776154036888', // 네버랜드 클래식
  'reg_1776158746744', // 서양고전읽기
  'reg_1776240768916'  // 노벨문학상 수상작
]);

export const WESTERN_CLASSIC_REGION_TITLES = [
  '네버랜드 클래식',
  '서양고전읽기',
  '노벨문학상 수상작'
];

export const WESTERN_CLASSIC_SPECIAL_DESTINATIONS = [
  'astra_frontier',
  'assignment_hub',
  'dark_matter',
  'reading_library'
];

/**
 * Check if the cluster is the Western Classic reading cluster
 * @param {string} clusterId
 * @returns {boolean}
 */
export function isWesternClassicCluster(clusterId) {
  if (!clusterId) return false;
  return WESTERN_CLASSIC_CLUSTER_IDS.has(String(clusterId).trim());
}

/**
 * Filter regions for Western Classic cluster, ensuring only the 3 canonical regions appear
 * @param {Array} regions
 * @param {string} clusterId
 * @returns {Array}
 */
export function filterWesternClassicRegions(regions = [], clusterId = '') {
  if (!isWesternClassicCluster(clusterId)) return regions;

  const candidates = Array.isArray(regions) ? regions.filter(Boolean) : [];
  return [...WESTERN_CLASSIC_REGION_IDS].map((canonicalId, index) => {
    const byId = candidates.find((region) => String(region.id || region.docId || '') === canonicalId);
    if (byId) return byId;
    const canonicalTitle = WESTERN_CLASSIC_REGION_TITLES[index];
    return candidates.find((region) => String(region.title || '').trim() === canonicalTitle) || null;
  }).filter(Boolean);
}
