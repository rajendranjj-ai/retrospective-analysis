'use client'

interface ResponseTableProps {
  responses: { [month: string]: string[] } | null
  questionTitle: string
  responseCounts?: { [month: string]: number }
}

export default function ResponseTable({ responses, questionTitle, responseCounts }: ResponseTableProps) {
  if (!responses || Object.keys(responses).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Response Analysis: {questionTitle}
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-2"></div>
            <p>Loading response data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Sort months chronologically
  const extractMonthOrder = (monthName: string): number => {
    const monthMap: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
      'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    
    const parts = monthName.split(' ');
    const month = parts[0];
    const year = parseInt(parts[1]) || 2024;
    
    return year * 100 + (monthMap[month] || 0);
  };

  const sortedMonths = Object.keys(responses).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Response Analysis: {questionTitle}
      </h3>
      
      <div className="space-y-6">
        {sortedMonths.map(month => {
          const monthResponses = responses[month] || [];
          const responseCount = responseCounts?.[month] || monthResponses.length;
          
          // Filter out empty responses
          const validResponses = monthResponses.filter(response => 
            response && response.trim() !== '' && response.trim() !== 'N/A' && response.trim() !== '-'
          );

          if (validResponses.length === 0) return null;

          return (
            <div key={month} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-800">
                  {month} ({validResponses.length} responses)
                </h4>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {validResponses.map((response, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {response}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        
        {sortedMonths.every(month => {
          const monthResponses = responses[month] || [];
          const validResponses = monthResponses.filter(response => 
            response && response.trim() !== '' && response.trim() !== 'N/A' && response.trim() !== '-'
          );
          return validResponses.length === 0;
        }) && (
          <div className="text-center py-8 text-gray-500">
            <p>No responses available for this question</p>
          </div>
        )}
      </div>
    </div>
  )
}
