export interface VoiceCommandAction {
  filter?: string;
  timeRange?: string;
  action?: string;
  metric?: string;
}

export const parseVoiceCommand = (transcript: string): VoiceCommandAction => {
  const lowerTranscript = transcript.toLowerCase();
  const result: VoiceCommandAction = {};

  // Time range commands
  if (lowerTranscript.includes('weekly') || lowerTranscript.includes('week')) {
    result.timeRange = 'weekly';
  } else if (lowerTranscript.includes('monthly') || lowerTranscript.includes('month')) {
    result.timeRange = 'monthly';
  } else if (lowerTranscript.includes('quarterly') || lowerTranscript.includes('quarter')) {
    result.timeRange = 'quarterly';
  } else if (lowerTranscript.includes('yearly') || lowerTranscript.includes('year')) {
    result.timeRange = 'yearly';
  }

  // Filter commands
  if (lowerTranscript.includes('revenue')) {
    result.filter = 'revenue';
    result.metric = 'revenue';
  } else if (lowerTranscript.includes('campaign')) {
    result.filter = 'campaigns';
    result.metric = 'campaigns';
  } else if (lowerTranscript.includes('conversion')) {
    result.filter = 'conversion';
    result.metric = 'conversion';
  } else if (lowerTranscript.includes('cost')) {
    result.filter = 'cost';
    result.metric = 'cost';
  } else if (lowerTranscript.includes('profit')) {
    result.filter = 'profit';
    result.metric = 'profit';
  } else if (lowerTranscript.includes('click')) {
    result.filter = 'clicks';
    result.metric = 'clicks';
  } else if (lowerTranscript.includes('impression')) {
    result.filter = 'impressions';
    result.metric = 'impressions';
  }

  // Action commands
  if (lowerTranscript.includes('show') || lowerTranscript.includes('display')) {
    result.action = 'show';
  } else if (lowerTranscript.includes('hide')) {
    result.action = 'hide';
  } else if (lowerTranscript.includes('refresh') || lowerTranscript.includes('update')) {
    result.action = 'refresh';
  } else if (lowerTranscript.includes('export') || lowerTranscript.includes('download')) {
    result.action = 'export';
  } else if (lowerTranscript.includes('reset')) {
    result.action = 'reset';
  }

  return result;
};

export const getCommandFeedback = (action: VoiceCommandAction): string => {
  if (action.timeRange) {
    return `Switched to ${action.timeRange} view`;
  }
  if (action.filter && action.action === 'show') {
    return `Showing ${action.filter} data`;
  }
  if (action.action === 'refresh') {
    return 'Refreshing dashboard data';
  }
  if (action.action === 'export') {
    return 'Preparing data export';
  }
  if (action.action === 'reset') {
    return 'Dashboard reset to default view';
  }
  
  return 'Command recognized';
};

/**
 * Check if a transcript is a dashboard control command or a natural language query.
 * Returns true if it's a recognized dashboard command.
 */
export const isDashboardCommand = (transcript: string): boolean => {
  const action = parseVoiceCommand(transcript);
  return !!(action.timeRange || action.filter || action.action);
};
