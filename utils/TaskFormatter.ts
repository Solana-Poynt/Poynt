import { Key } from 'react';

export const formatTaskDescription = (
  taskType: string,
  description: string
): {
  icon: any;
  title: string;
  details: string;
} => {
  
  const lowerDesc = description.toLowerCase();

  // Default values
  let icon = 'checkmark-circle-outline';
  let title = 'Complete Task';
  let details = description;

  // Check for Twitter/X tasks
  if (lowerDesc.includes('follow')) {
    icon = 'person-add-outline';
    title = 'Follow on Twitter';
    details = 'Follow the account on Twitter';
  } else if (lowerDesc.includes('retweet') || lowerDesc.includes('rt')) {
    icon = 'repeat-outline';
    title = 'Retweet Post';
    details = 'Retweet the campaign post';
  } else if (lowerDesc.includes('comment')) {
    icon = 'chatbubble-outline';
    title = 'Comment on Post';
    details = 'Leave a comment on the campaign post';
  } else if (lowerDesc.includes('like')) {
    icon = 'heart-outline';
    title = 'Like Post';
    details = 'Like the campaign post';
  } else if (lowerDesc.includes('tweet') || lowerDesc.includes('post')) {
    icon = 'create-outline';
    title = 'Create Tweet';
    details = 'Create a new tweet about the campaign';
  }

  return { icon, title, details };
};
