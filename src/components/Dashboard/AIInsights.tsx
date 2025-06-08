import React from 'react';
import { Brain, TrendingUp, AlertCircle, Target } from 'lucide-react';

const insights = [
  {
    icon: TrendingUp,
    title: 'Sales Trend',
    message: 'Your sales have increased by 15% this week. Consider restocking popular items.',
    type: 'positive'
  },
  {
    icon: AlertCircle,
    title: 'Inventory Alert',
    message: 'Electronics category is running low. Recommend ordering within 3 days.',
    type: 'warning'
  },
  {
    icon: Target,
    title: 'Revenue Goal',
    message: 'You are 78% towards your monthly revenue target. Great progress!',
    type: 'info'
  }
];

export default function AIInsights() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Financial Insights</h3>
        <Brain className="h-5 w-5 text-purple-500" />
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
            <div className={`p-2 rounded-lg ${
              insight.type === 'positive' ? 'bg-green-100' :
              insight.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              <insight.icon className={`h-4 w-4 ${
                insight.type === 'positive' ? 'text-green-600' :
                insight.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{insight.title}</p>
              <p className="text-gray-600 text-sm mt-1">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}