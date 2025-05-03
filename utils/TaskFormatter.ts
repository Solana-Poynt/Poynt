export const mapTaskType = (taskKey: string, url: string): string => {
  // Backend mapping:
  // social === follow
  // interaction === like
  // custom - needs more analysis
  switch (taskKey) {
    case 'social':
      return 'follow';
    case 'interaction':
      return 'like';
    case 'custom':
      // For custom tasks, check URL content to determine if it's retweet, comment or visit
      if (url.toLowerCase().includes('retweet') || url.toLowerCase().includes('rt')) {
        return 'retweet';
      } else if (url.toLowerCase().includes('comment')) {
        return 'comment';
      } else if (!url.includes('twitter.com') && !url.includes('x.com')) {
        return 'visit'; // For non-Twitter URLs
      }
      return 'comment'; // Default for custom tasks pointing to Twitter
    default:
      // Only use URL content as fallback
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('follow')) return 'follow';
      if (lowerUrl.includes('like')) return 'like';
      if (lowerUrl.includes('retweet') || lowerUrl.includes('rt')) return 'retweet';
      if (lowerUrl.includes('comment')) return 'comment';
      if (!url.includes('twitter.com') && !url.includes('x.com')) return 'visit';
      return 'comment'; // More conservative default
  }
};

/**
 * Format task description based on task type and URL
 */
export const formatTaskDescription = (
  taskType: string,
  url: string
): {
  icon: string;
  title: string;
  details: string;
} => {
  // Extract account username from URL for display
  const accountName = extractUsernameFromUrl(url);

  switch (taskType) {
    case 'follow':
      return {
        icon: 'person-add-outline',
        title: `Follow @${accountName || 'account'}`,
        details: `Follow @${accountName || 'the account'} on X/Twitter`,
      };
    case 'like':
      return {
        icon: 'heart-outline',
        title: 'Like Tweet',
        details: `Like the tweet from @${accountName || 'the campaign'}`,
      };
    case 'retweet':
      return {
        icon: 'repeat-outline',
        title: 'Retweet',
        details: `Retweet the post from @${accountName || 'the campaign'}`,
      };
    case 'comment':
      return {
        icon: 'chatbubble-outline',
        title: 'Comment',
        details: `Comment on the tweet from @${accountName || 'the campaign'}`,
      };
    case 'visit':
      return {
        icon: 'open-outline',
        title: 'Visit Website',
        details: `Visit the link: ${url.substring(0, 30)}${url.length > 30 ? '...' : ''}`,
      };
    default:
      return {
        icon: 'checkmark-circle-outline',
        title: 'Complete Task',
        details: url,
      };
  }
};

/**
 * Extract username from Twitter URL
 */
export const extractUsernameFromUrl = (url: string): string | null => {
  try {
    const cleanUrl = url.trim();
    const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);

    if (urlObj.hostname === 'x.com' || urlObj.hostname === 'twitter.com') {
      // Format: twitter.com/username or twitter.com/username/status/123
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        return pathParts[0];
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Get icon name based on task verification status
 */
export const getTaskStatusIcon = (
  isCompleted: boolean,
  isAttempted: boolean,
  taskType: string
): string => {
  if (isCompleted) {
    return 'checkmark-circle';
  }

  if (isAttempted) {
    return 'time-outline';
  }

  switch (taskType) {
    case 'follow':
      return 'person-add-outline';
    case 'like':
      return 'heart-outline';
    case 'retweet':
      return 'repeat-outline';
    case 'comment':
      return 'chatbubble-outline';
    case 'visit':
      return 'open-outline';
    default:
      return 'alert-circle-outline';
  }
};

/**
 * Get task description with appropriate verification instructions
 */
export const getTaskVerificationInstructions = (taskType: string): string => {
  switch (taskType) {
    case 'follow':
      return 'We will verify your follow automatically';
    case 'like':
      return 'Click "Verify" after liking the tweet';
    case 'retweet':
      return 'Copy your retweet link and paste it to verify';
    case 'comment':
      return 'Copy your comment link and paste it to verify';
    case 'visit':
      return 'Click the link, then click "Verify"';
    default:
      return 'Complete the task and click verify';
  }
};
