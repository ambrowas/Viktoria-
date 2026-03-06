
export const resolveMediaUrl = (url: string) => {
  if (!url) {
    return '';
  }
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // For bundled assets, Electron needs a relative path from the root.
  return `./${url}`;
};
