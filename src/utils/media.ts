export const resolveMediaUrl = (url: string) => {
  if (!url) {
    return "";
  }

  // If it's already a full URL or a special protocol, leave it alone
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("file:")
  ) {
    return url;
  }

  // Check if it's an absolute path (starts with / or a Windows drive letter like C:\)
  const isAbsolute = url.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(url);

  if (isAbsolute) {
    // In Electron, absolute paths should be prefixed with file:// for proper local resolution
    return `file://${url}`;
  }

  // For relative paths (like 'images/uploads/...'):
  // 1. If we are in Electron development/production, we want to try to resolve it
  //    relative to the 'public' folder or the app root.
  // We use the browser's ability to resolve root-relative paths for anything in 'public'
  return `/${url}`;
};
