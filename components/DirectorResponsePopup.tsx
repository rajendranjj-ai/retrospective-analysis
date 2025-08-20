'use client'

import React from 'react'

interface DirectorResponseData {
  director: string
  count: number
  totalCount?: number
  participationRate?: number
}

interface DirectorResponsePopupProps {
  isOpen: boolean
  onClose: () => void
  month: string | null
  data: DirectorResponseData[]
  loading: boolean
}

export default function DirectorResponsePopup({ 
  isOpen, 
  onClose, 
  month, 
  data, 
  loading 
}: DirectorResponsePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {month} - Response Count by Director
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.length > 0 ? (
              <>
                {/* Check if this month has participation data */}
                {data.some(item => item.totalCount !== undefined) ? (
                  // Enhanced table with participation data
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold text-gray-900">Director</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-900">Responses</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-900">Total</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-900">% Participated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-700 font-medium">{item.director}</td>
                            <td className="py-2 px-3 text-right text-blue-600 font-semibold">{item.count}</td>
                            <td className="py-2 px-3 text-right text-gray-600">{item.totalCount || '-'}</td>
                            <td className="py-2 px-3 text-right text-green-600 font-semibold">
                              {item.participationRate ? `${item.participationRate.toFixed(1)}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-gray-900">Total Responses</span>
                        <span className="text-blue-600">
                          {data.reduce((sum, item) => sum + item.count, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Simple list for months without participation data
                  <>
                    {data.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-gray-700 font-medium">{item.director}</span>
                        <span className="text-blue-600 font-semibold">{item.count}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-blue-600">
                          {data.reduce((sum, item) => sum + item.count, 0)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available for this month</p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
