/**
 * Format seconds into mm:ss timestamp string.
 * @param {number} seconds 
 * @returns {string} e.g. "3:45"
 */
export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null || seconds === undefined || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default {
  formatTime,
};
