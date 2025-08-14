'use client'

import { useState, useEffect } from 'react'
import TrendChart from './TrendChart'
import QuestionSelector from './QuestionSelector'

interface DirectorTrendAnalysisProps {
  questionCategories: { [key: string]: string[] }
  orderedQuestions: string[]
  sections: { [key: string]: string[] }
}

interface DirectorTrendsData {
  trends: Record<string, Record<string, number>>
  responseCounts: Record<string, number>
  summaryData: any[]
  question: string
}

export default function DirectorTrendAnalysis({ 
  questionCategories, 
  orderedQuestions,
  sections 
}: DirectorTrendAnalysisProps) {
  const [selectedDirector, setSelectedDirector] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('All Sections')
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [directorTrends, setDirectorTrends] = useState<DirectorTrendsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [directors] = useState<string[]>([
    'Jegadeesh Santhana Krishnan',
    'Krishna Kishore Mothukuri', 
    'Mohammed Fayaz',
    'Mujtaba Ahmad',
    'Others',
    'Sandeep Kumar'
  ])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedQuestion('')
    setDirectorTrends(null)
  }

  const handleSectionChange = (section: string) => {
    setSelectedSection(section)
    setSelectedQuestion('')
    setDirectorTrends(null)
  }

  const handleQuestionChange = async (question: string) => {
    setSelectedQuestion(question)
    
    if (question && selectedDirector) {
      setLoading(true)
      try {
        // Fetch director-specific trends for this question
        const response = await fetch(`/api/director-trends/${encodeURIComponent(question)}?director=${encodeURIComponent(selectedDirector)}`)
        const data = await response.json()
        setDirectorTrends(data)
      } catch (error) {
        console.error('Error fetching director trends:', error)
      } finally {
        setLoading(false)
      }
    } else {
      setDirectorTrends(null)
    }
  }

  const handleDirectorChange = async (director: string) => {
    setSelectedDirector(director)
    
    if (director && selectedQuestion) {
      setLoading(true)
      try {
        const response = await fetch(`/api/director-trends/${encodeURIComponent(selectedQuestion)}?director=${encodeURIComponent(director)}`)
        const data = await response.json()
        setDirectorTrends(data)
      } catch (error) {
        console.error('Error fetching director trends:', error)
      } finally {
        setLoading(false)
      }
    } else {
      setDirectorTrends(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Director Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Director</h2>
        <select
          value={selectedDirector}
          onChange={(e) => handleDirectorChange(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose a director...</option>
          {directors.map((director) => (
            <option key={director} value={director}>
              {director}
            </option>
          ))}
        </select>
      </div>

      {/* Question Selection */}
      {selectedDirector && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Question for {selectedDirector}
          </h2>
          <QuestionSelector
            questionCategories={questionCategories}
            orderedQuestions={orderedQuestions}
            sections={sections}
            selectedCategory={selectedCategory}
            selectedSection={selectedSection}
            selectedQuestion={selectedQuestion}
            onCategoryChange={handleCategoryChange}
            onSectionChange={handleSectionChange}
            onQuestionChange={handleQuestionChange}
          />
        </div>
      )}

      {/* Selected Analysis Display */}
      {selectedDirector && selectedQuestion && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">📊 Director Analysis</h2>
          <p className="text-blue-800 text-lg leading-relaxed font-medium mb-2">
            <strong>Director:</strong> {selectedDirector}
          </p>
          <p className="text-blue-800 text-lg leading-relaxed font-medium">
            <strong>Question:</strong> {selectedQuestion}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading director trends...</p>
            </div>
          </div>
        </div>
      )}

      {/* Trend Analysis Chart */}
      {directorTrends && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Trend Analysis - {selectedDirector}
          </h2>
          <TrendChart
            trends={directorTrends.trends}
            questionTitle={selectedQuestion}
            responseCounts={directorTrends.responseCounts}
          />
        </div>
      )}

      {/* No Data State */}
      {selectedDirector && selectedQuestion && !directorTrends && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center h-64 flex items-center justify-center">
            <div>
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <p className="text-gray-600 text-lg">
                No trend data available for this director and question combination.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Try selecting a different question or director.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}