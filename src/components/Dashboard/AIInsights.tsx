import React from 'react';
import { Brain, TrendingUp, AlertCircle, Target, DollarSign, Package, Users } from 'lucide-react';

const insights = [
  {
    icon: TrendingUp,
    title: 'Sales Performance',
    message: 'Your sales have increased by 15% this week compared to last week. Electronics category is performing exceptionally well.',
    type: 'positive',
    action: 'Consider increasing electronics inventory'
  },
  {
    icon: AlertCircle,
    title: 'Inventory Alert',
    message: 'Electronics category is running low on 3 items. Coffee Mugs are critically low with only 2 units remaining.',
    type: 'warning',
    action: 'Reorder within 2-3 days'
  },
  {
    icon: Target,
    title: 'Revenue Goal',
    message: 'You are 78% towards your monthly revenue target of $50,000. At current pace, you\'ll exceed the goal by 5%.',
    type: 'info',
    action: 'Maintain current sales momentum'
  },
  {
    icon: DollarSign,
    title: 'Credit Management',
    message: 'You have $2,340 in pending credits. 2 credits are approaching their due date this week.',
    type: 'warning',
    action: 'Follow up with customers'
  },
  {
    icon: Package,
    title: 'Stock Optimization',
    message: 'Based on sales patterns, consider reducing inventory for slow-moving items and increasing fast-sellers.',
    type: 'info',
    action: 'Review inventory allocation'
  },
  {
    icon: Users,
    title: 'Customer Insights',
    message: 'Repeat customers account for 65% of your revenue. Customer retention is strong in the electronics segment.',
    type: 'positive',
    action: 'Expand customer loyalty programs'
  }
];

export default function AIInsights() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Business Insights</h3>
          <p className="text-sm text-gray-600">Powered by intelligent analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span className="text-xs text-purple-600 font-medium">AI POWERED</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              insight.type === 'positive' ? 'bg-green-100' :
              insight.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              <insight.icon className={`h-4 w-4 ${
                insight.type === 'positive' ? 'text-green-600' :
                insight.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{insight.title}</p>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed">{insight.message}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  insight.type === 'positive' ? 'bg-green-100 text-green-700' :
                  insight.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  💡 {insight.action}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">Smart Recommendation</span>
        </div>
        <p className="text-sm text-purple-800">
          Based on your current performance, focus on inventory management and customer retention. 
          Your business is growing steadily with strong fundamentals.
        </p>
      </div>
    </div>
  );
}