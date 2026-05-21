import { Card } from '@/components/ui/card';
import { Info, Mic, Volume2, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const VoiceControlInfo = () => {
  const commands = [
    { command: '"Show revenue data"', description: 'Focus cards/charts on revenue' },
    { command: '"Show campaign analytics"', description: 'Focus campaign analytics metrics' },
    { command: '"Display click metrics"', description: 'Focus click-through metrics' },
    { command: '"Show conversion data"', description: 'Focus conversion metrics' },
    { command: '"Show impression metrics"', description: 'Focus impression metrics' },
    { command: '"Refresh dashboard"', description: 'Reload all dashboard data' },
    { command: '"Export data"', description: 'Prepare data for export' },
    { command: '"Reset view"', description: 'Reset to default view' },
  ];

  const dataQuestions = [
    { question: '"What is the total revenue this month?"', source: 'campaign_metrics.revenue' },
    { question: '"How many active campaigns do we have?"', source: 'campaigns.status' },
    { question: '"What is our click-through rate?"', source: 'campaign_metrics.clicks + impressions' },
    { question: '"How many conversions did we get this quarter?"', source: 'campaign_metrics.conversions' },
    { question: '"Show top 5 campaigns by revenue"', source: 'campaigns + campaign_metrics' },
  ];

  const tips = [
    { icon: Mic, text: 'Speak clearly in a quiet environment' },
    { icon: Volume2, text: 'Wait for "Listening..." indicator before speaking' },
    { icon: Globe, text: 'Requires internet connection (uses Web Speech API)' },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Voice Control Guide
          </h3>
          <p className="text-sm text-muted-foreground">
            Control your dashboard using natural language voice commands
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Available Commands */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">
            Available Commands
          </h4>
          <div className="space-y-2">
            {commands.map((cmd, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-neutral-50 rounded-lg p-3 border border-neutral-200"
              >
                <p className="text-sm font-medium text-foreground mb-1">
                  {cmd.command}
                </p>
                <p className="text-xs text-muted-foreground">{cmd.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">
            Tips for Best Results
          </h4>
          <div className="space-y-2">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground/90">{tip.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data-backed Questions */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">
            Data-Backed Questions (from data folder)
          </h4>
          <div className="space-y-2">
            {dataQuestions.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-neutral-50 rounded-lg p-3 border border-neutral-200"
              >
                <p className="text-sm font-medium text-foreground mb-1">{item.question}</p>
                <p className="text-xs text-muted-foreground">Uses: {item.source}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <p className="text-sm font-medium text-amber-900 mb-2">
            Having trouble?
          </p>
          <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
            <li>Make sure microphone permissions are enabled in your browser</li>
            <li>Use Chrome, Edge, or Safari for best compatibility</li>
            <li>Check that your microphone is working properly</li>
            <li>Ensure you have a stable internet connection</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
