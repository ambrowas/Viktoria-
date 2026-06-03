export const resolveMediaUrl = (url?: string) => {
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

  // Normalize absolute paths that point to local Application Support uploads
  // e.g. /Users/.../Application Support/.../uploads/filename.ext
  if (url.includes("uploads/")) {
    const filename = url.split("uploads/").pop();
    if (filename) {
      if (window.electronAPI && window.electronAPI.userDataPath) {
        return `file://${window.electronAPI.userDataPath}/uploads/${filename}`;
      }
      const normalizedRelative = `images/uploads/${filename}`;
      // In development or when loaded via HTTP, root-relative is best
      if (window.location.protocol !== "file:") {
        return `/${normalizedRelative}`;
      } else {
        // In production loaded via file://, a relative path (no leading slash) is required
        return normalizedRelative;
      }
    }
  }

  // Check if it's an absolute path (starts with / or a Windows drive letter like C:\)
  const isAbsolute = url.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(url);

  if (isAbsolute) {
    // In Electron, absolute paths should be prefixed with file:// for proper local resolution
    return `file://${url}`;
  }

  // For relative paths (like 'images/uploads/...'):
  if (window.location.protocol !== "file:") {
    return `/${url}`;
  }
  return url;
};

