export const formatTaskDescription = (
  taskType: string,
  description: string
): {
  icon: string;
  title: string;
  details: string;
} => {
  const lowerDesc = description.toLowerCase();

  let icon = 'checkmark-circle-outline';
  let title = 'Complete Task';
  let details = description;

  if (lowerDesc.includes('follow')) {
    icon = 'person-add-outline';
    title = 'Follow';
    details = 'Follow the account on Twitter';
  } else if (lowerDesc.includes('retweet') || lowerDesc.includes('rt')) {
    icon = 'repeat-outline';
    title = 'Retweet';
    details = 'Retweet the campaign post';
  } else if (lowerDesc.includes('comment')) {
    icon = 'chatbubble-outline';
    title = 'Comment';
    details = 'Leave a comment on the campaign post';
  } else if (lowerDesc.includes('like')) {
    icon = 'heart-outline';
    title = 'Like';
    details = 'Like the campaign post';
  } else if (lowerDesc.includes('tweet') || lowerDesc.includes('post')) {
    icon = 'create-outline';
    title = 'Tweet';
    details = 'Create a new tweet about the campaign';
  }

  return { icon, title, details };
};
