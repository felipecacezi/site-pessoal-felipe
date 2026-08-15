/**
 * Centralized utility to sort raw Google Drive files by their pure name.
 * 
 * @param {Array} files - Raw file objects from Google Drive API
 * @returns {Array} Sorted copy of the files array
 */
export function sortRawDriveFiles(files) {
  if (!files || !Array.isArray(files)) return [];
  return [...files].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });
}
