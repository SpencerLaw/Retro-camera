export type ModernEmotionTone = 'calm' | 'caution' | 'danger';

type ModernEmotionInput = {
  readonly currentDb: number;
  readonly limit: number;
  readonly monitorState: 'calm' | 'alarm';
};

export const getModernEmotionTone = ({
  currentDb,
  limit,
  monitorState
}: ModernEmotionInput): ModernEmotionTone => {
  switch (monitorState) {
    case 'alarm':
      return 'danger';
    case 'calm':
      break;
    default: {
      const exhaustiveState: never = monitorState;
      throw new TypeError(`Unexpected monitor state: ${exhaustiveState}`);
    }
  }

  if (currentDb >= limit) return 'danger';
  if (currentDb >= limit - 10) return 'caution';
  return 'calm';
};
