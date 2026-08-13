const workbookFileNameCollator = new Intl.Collator('ko', {
  numeric: true,
  sensitivity: 'base',
});

export const sortWorkbookImageFiles = (files) => Array.from(files || [])
  .map((file, originalIndex) => ({ file, originalIndex }))
  .sort((a, b) => workbookFileNameCollator.compare(a.file.name, b.file.name) || a.originalIndex - b.originalIndex)
  .map(({ file }) => file);

export const isSupportedWorkbookImage = (file) => {
  const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (supportedTypes.has(file?.type)) return true;
  return /\.(?:jpe?g|png|webp)$/i.test(file?.name || '');
};
