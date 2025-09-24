'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import TrendChart from './TrendChart'

interface DirectorTrendAnalysisProps {
  questionCategories: { [key: string]: string[] }
  orderedQuestions: string[]
  sections: { [key: string]: string[] }
}

interface DirectorTrendsData {
  trends: Record<string, Record<string, number>>
  responseCounts: Record<string, number>
  rawCounts: Record<string, Record<string, number>>
  summaryData: any[]
  question: string
}

export default function DirectorTrendAnalysis({ 
  questionCategories, 
  orderedQuestions,
  sections 
}: DirectorTrendAnalysisProps) {
  
  const [selectedDirector, setSelectedDirector] = useState<string>('')
  const [allTrends, setAllTrends] = useState<{ [question: string]: DirectorTrendsData }>({})
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [loadedQuestions, setLoadedQuestions] = useState<Set<string>>(new Set())
  const [tablePagination, setTablePagination] = useState<{ [question: string]: number }>({})
  
  const [directors] = useState<string[]>([
    'Jegadeesh Santhana Krishnan',
    'Krishna Kishore Mothukuri', 
    'Mohammed Fayaz',
    'Mujtaba Ahmad',
    'Diksha Khatri',
    'Others'
  ])

  // Helper function to check if a question should be displayed as a table
  const isTableQuestion = (question: string) => {
    const tableQuestions = [
      "What was the action item and how was it resolved during the release?",
      "What was the action item and how was it resolved during the release? ", // Handle potential trailing space
      "Any other thought you would like to share related to the releases.",
      "Do you have any suggestion for improving and streamlining the release further?",
      "Any Suggestions for Jira enhancements?",
      "What was your engagement area during this release while not associated with the release deliverables?",
      "Share an interesting use case where Cursor helped you",
      "Any feedback/suggestion on Cursor Usage ?",
      "Are you getting all the support for AI adoption from various forums (Slack / email / Lunch n Learn series) ? Please highlight where the support can be further improved.",
      "What types of tasks do you use Cursor, Copilot for ?",
      "What types of tasks do you use Cursor, Copilot for ? (select all that apply)"
    ]
    return tableQuestions.some(tableQ => question.trim() === tableQ.trim())
  }

  // Helper function to get current page for a question
  const getCurrentPage = (question: string) => {
    return tablePagination[question] || 0
  }

  // Helper function to set page for a question
  const setQuestionPage = (question: string, page: number) => {
    setTablePagination(prev => ({ ...prev, [question]: page }))
  }

  // Generate AI summary from text responses
  const generateAISummary = (answers: Array<{answer: string, totalResponses: number}>, questionText: string) => {
    if (answers.length === 0) return "No responses available for analysis."
    
    const allResponses = answers.flatMap(item => Array(item.totalResponses).fill(item.answer))
    const totalResponses = allResponses.length
    
    // Extract key themes and patterns
    const commonWords = extractCommonThemes(allResponses)
    const sentiment = analyzeSentiment(allResponses)
    const categories = categorizeResponses(allResponses, questionText)
    
    // Generate summary based on question type
    let summary = `📊 **Analysis of ${totalResponses} responses:**\n\n`
    
    if (questionText.toLowerCase().includes('cursor') || questionText.toLowerCase().includes('ai') || questionText.toLowerCase().includes('copilot')) {
      summary += `🤖 **AI Tool Insights:** ${generateAIToolSummary(categories, sentiment)}\n\n`
    } else if (questionText.toLowerCase().includes('jira')) {
      summary += `🔧 **Jira Enhancement Themes:** ${generateJiraSummary(categories, commonWords)}\n\n`
    } else if (questionText.toLowerCase().includes('action item')) {
      summary += `✅ **Action Item Patterns:** ${generateActionItemSummary(categories)}\n\n`
    } else {
      summary += `💡 **Key Insights:** ${generateGeneralSummary(categories, sentiment)}\n\n`
    }
    
    summary += `📈 **Response Distribution:** ${answers.length} unique responses, most common themes: ${commonWords.slice(0, 3).join(', ')}\n\n`
    summary += `🎯 **Overall Sentiment:** ${sentiment.overall} (${Math.round(sentiment.positiveRatio * 100)}% positive)`
    
    return summary
  }

  // Helper functions for AI summary generation
  const extractCommonThemes = (responses: string[]) => {
    const wordCounts: {[key: string]: number} = {}
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'])
    
    responses.forEach(response => {
      const words = response.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1
        }
      })
    })
    
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)
  }

  const analyzeSentiment = (responses: string[]) => {
    const positiveWords = ['good', 'great', 'excellent', 'helpful', 'useful', 'effective', 'improved', 'better', 'positive', 'satisfied', 'happy', 'love', 'like', 'amazing', 'fantastic', 'perfect']
    const negativeWords = ['bad', 'poor', 'terrible', 'useless', 'ineffective', 'worse', 'negative', 'dissatisfied', 'unhappy', 'hate', 'dislike', 'awful', 'frustrating', 'difficult', 'problem', 'issue']
    
    let positiveCount = 0
    let negativeCount = 0
    
    responses.forEach(response => {
      const words = response.toLowerCase().split(/\s+/)
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++
        if (negativeWords.includes(word)) negativeCount++
      })
    })
    
    const total = positiveCount + negativeCount
    const positiveRatio = total > 0 ? positiveCount / total : 0.5
    
    let overall = 'Neutral'
    if (positiveRatio > 0.6) overall = 'Positive'
    else if (positiveRatio < 0.4) overall = 'Negative'
    
    return { overall, positiveRatio, positiveCount, negativeCount }
  }

  const categorizeResponses = (responses: string[], questionText: string) => {
    const categories: {[key: string]: string[]} = {}
    
    if (questionText.toLowerCase().includes('cursor') || questionText.toLowerCase().includes('ai')) {
      categories['Code Generation'] = responses.filter(r => r.toLowerCase().includes('generate') || r.toLowerCase().includes('create') || r.toLowerCase().includes('write'))
      categories['Debugging'] = responses.filter(r => r.toLowerCase().includes('debug') || r.toLowerCase().includes('fix') || r.toLowerCase().includes('error'))
      categories['Productivity'] = responses.filter(r => r.toLowerCase().includes('fast') || r.toLowerCase().includes('quick') || r.toLowerCase().includes('efficient'))
      categories['Learning'] = responses.filter(r => r.toLowerCase().includes('learn') || r.toLowerCase().includes('understand') || r.toLowerCase().includes('help'))
    } else if (questionText.toLowerCase().includes('jira')) {
      categories['UI/UX'] = responses.filter(r => r.toLowerCase().includes('interface') || r.toLowerCase().includes('ui') || r.toLowerCase().includes('user'))
      categories['Performance'] = responses.filter(r => r.toLowerCase().includes('slow') || r.toLowerCase().includes('fast') || r.toLowerCase().includes('speed'))
      categories['Features'] = responses.filter(r => r.toLowerCase().includes('feature') || r.toLowerCase().includes('function') || r.toLowerCase().includes('add'))
    } else {
      categories['Process'] = responses.filter(r => r.toLowerCase().includes('process') || r.toLowerCase().includes('workflow'))
      categories['Communication'] = responses.filter(r => r.toLowerCase().includes('communication') || r.toLowerCase().includes('meeting') || r.toLowerCase().includes('discuss'))
      categories['Technical'] = responses.filter(r => r.toLowerCase().includes('technical') || r.toLowerCase().includes('code') || r.toLowerCase().includes('development'))
    }
    
    return categories
  }

  const generateAIToolSummary = (categories: {[key: string]: string[]}, sentiment: any) => {
    const insights: string[] = []
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        insights.push(`${category}: ${items.length} mentions`)
      }
    })
    return insights.length > 0 ? insights.join(', ') : 'Various AI tool usage patterns identified'
  }

  const generateJiraSummary = (categories: {[key: string]: string[]}, commonWords: string[]) => {
    const insights: string[] = []
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        insights.push(`${category} improvements: ${items.length} suggestions`)
      }
    })
    return insights.length > 0 ? insights.join(', ') : `Focus areas include: ${commonWords.slice(0, 3).join(', ')}`
  }

  const generateActionItemSummary = (categories: {[key: string]: string[]}) => {
    return 'Action items cover process improvements, technical enhancements, and team coordination'
  }

  const generateGeneralSummary = (categories: {[key: string]: string[]}, sentiment: any) => {
    const insights: string[] = []
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        insights.push(`${category}: ${items.length} responses`)
      }
    })
    return insights.length > 0 ? insights.join(', ') : 'Diverse feedback covering multiple areas'
  }

  const getUniqueAnswersFromTrends = (trendsData: DirectorTrendsData, questionText: string) => {
    const uniqueAnswers: Array<{answer: string, months: string[], totalResponses: number}> = []
    
    // For all table questions (text-based questions), use the latest available month
    // Only trend graph questions show data across all months
    const availableMonths = Object.keys(trendsData.trends).sort((a, b) => {
      const extractMonthOrder = (monthName: string) => {
        const [monthStr, yearStr] = monthName.split(' ')
        const year = parseInt(yearStr)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December']
        const month = monthNames.indexOf(monthStr) + 1
        return year * 100 + month
      }
      return extractMonthOrder(b) - extractMonthOrder(a) // Sort descending to get latest first
    })
    
    const targetMonth = availableMonths[0] // Get the latest month for all table questions
    console.log(`🔄 Director Analysis: Using latest month '${targetMonth}' for table question: ${questionText.substring(0, 50)}...`)
    
    const monthData = trendsData.trends[targetMonth]

    if (!monthData) {
      console.warn(`No data found for ${targetMonth}`)
      return uniqueAnswers
    }

    Object.entries(monthData).forEach(([answer, percentage]) => {
      const cleanAnswer = answer.trim().toLowerCase()
      if (!answer || cleanAnswer === '' ||
          cleanAnswer === 'n/a' || cleanAnswer === 'na' ||
          cleanAnswer === 'none' || cleanAnswer === 'nil' ||
          cleanAnswer === 'no' || cleanAnswer === 'not applicable' ||
          cleanAnswer === 'no action' || cleanAnswer === 'no suggestion' ||
          cleanAnswer === 'no thoughts' || cleanAnswer === 'no feedback' ||
          cleanAnswer === 'nothing' || cleanAnswer === 'not sure' ||
          cleanAnswer === '-' || cleanAnswer === '--' ||
          cleanAnswer.includes('not applicable') ||
          cleanAnswer.includes('no suggestions') ||
          cleanAnswer.includes('no comments') ||
          cleanAnswer.includes('no thoughts') ||
          cleanAnswer.includes('no feedback')) {
        return
      }

      let totalResponses
      if (isTableQuestion(questionText)) {
        totalResponses = Math.round(percentage) // Directly use count from server
      } else {
        const monthTotal = trendsData.responseCounts[targetMonth] || 100
        totalResponses = Math.round((percentage / 100) * monthTotal)
      }

      uniqueAnswers.push({
        answer: answer,
        months: [targetMonth],
        totalResponses: totalResponses
      })
    })

    return uniqueAnswers.sort((a, b) => {
      const lengthDiff = b.answer.length - a.answer.length
      if (lengthDiff !== 0) return lengthDiff
      return b.totalResponses - a.totalResponses
    })
  }

  const loadAllDirectorTrends = async (director: string) => {
    if (Object.keys(sections).length === 0) {
      console.log('No sections available yet, skipping trend loading')
      return
    }

    console.log(`🔄 Loading director trends for all questions for ${director}...`)
    setTrendsLoading(true)

    const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? 'http://localhost:4005' 
      : '';
      
    const newAllTrends: { [question: string]: DirectorTrendsData } = {}
    const newLoadedQuestions = new Set<string>()
    let totalQuestions = 0
    let processedQuestions = 0

    // Count total questions
    Object.values(sections).forEach(sectionQuestions => {
      totalQuestions += sectionQuestions.length
    })

    console.log(`📊 Loading director trends for ${totalQuestions} questions across ${Object.keys(sections).length} sections`)

    try {
      // Process questions in batches
      const batchSize = 3
      const allQuestions = Object.values(sections).flat()
      
      for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize)
        
        // Process batch sequentially
        for (const question of batch) {
          try {
            const response = await fetch(`${apiBaseUrl}/api/director-trends/${encodeURIComponent(question)}?director=${encodeURIComponent(director)}`, {
              credentials: 'include'
            })
            
            if (response.ok) {
              const trendsData = await response.json()
              newAllTrends[question] = trendsData
              newLoadedQuestions.add(question)
              processedQuestions++
              
              if (isTableQuestion(question)) {
                console.log(`✅ Loaded director table data for: "${question.substring(0, 60)}..." (${processedQuestions}/${totalQuestions})`)
              } else {
                console.log(`✅ Loaded director trends for: "${question.substring(0, 60)}..." (${processedQuestions}/${totalQuestions})`)
              }
            } else {
              const errorText = await response.text()
              console.log(`⚠️ Failed to load director data for: "${question.substring(0, 60)}..." - ${response.status}: ${errorText}`)
              processedQuestions++
            }
      } catch (error) {
            console.error(`❌ Error loading director data for question: "${question.substring(0, 60)}..."`, error)
            processedQuestions++
          }
          
          // Small delay between each request
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        // Update state after each batch
        setAllTrends({ ...newAllTrends })
        setLoadedQuestions(new Set(newLoadedQuestions))
      }

      console.log(`✅ Director trend loading completed: ${newLoadedQuestions.size}/${totalQuestions} questions loaded successfully`)
      
    } catch (error) {
      console.error('❌ Error during director trend loading:', error)
    } finally {
      setTrendsLoading(false)
    }
  }

  const handleDirectorChange = async (director: string) => {
    setSelectedDirector(director)
    setAllTrends({})
    setLoadedQuestions(new Set())
    setTablePagination({})
    
    if (director && Object.keys(sections).length > 0) {
      // Start loading all trends for this director
      setTimeout(() => {
        console.log('🔄 Starting director trend loading')
        loadAllDirectorTrends(director)
      }, 500)
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

      {/* Selected Director Analysis Display */}
      {selectedDirector && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">📊 Director Analysis</h2>
          <p className="text-blue-800 text-lg leading-relaxed font-medium mb-2">
            <strong>Director:</strong> {selectedDirector}
          </p>
          <p className="text-blue-700 text-sm">
            Showing all questions and their trends for this director's team responses only.
          </p>
        </div>
      )}

      {/* Loading/Status Information */}
      {selectedDirector && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Analysis Status
              </h3>
              {trendsLoading && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading director trends...</span>
                </div>
              )}
            </div>
            
            {!trendsLoading && loadedQuestions.size === 0 && Object.keys(sections).length > 0 && (
              <button
                onClick={() => {
                  console.log('🔄 Manual retry of director trend loading requested')
                  loadAllDirectorTrends(selectedDirector)
                }}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Load Charts
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{Object.keys(sections).length}</div>
              <div className="text-sm text-gray-600">Sections</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-900">{Object.values(sections).flat().length}</div>
              <div className="text-sm text-blue-700">Total Questions</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-900">{loadedQuestions.size}</div>
              <div className="text-sm text-green-700">Loaded</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-900">
                {Math.round((loadedQuestions.size / Math.max(Object.values(sections).flat().length, 1)) * 100)}%
              </div>
              <div className="text-sm text-yellow-700">Progress</div>
            </div>
          </div>

          {!trendsLoading && loadedQuestions.size === 0 && Object.keys(sections).length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                The trend analysis charts haven't loaded yet. Click "Load Charts" to start loading director-specific data, or check that you're logged in properly.
              </p>
              <div className="text-sm text-gray-600 mt-2">
                <span>📋 {Object.keys(sections).length} sections • </span>
                <span>📊 {Object.values(sections).flat().length} questions total (ready to load)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render all sections and their questions for selected director */}
      {selectedDirector && Object.entries(sections).map(([sectionName, sectionQuestions]) => (
        <div key={sectionName} className="bg-white rounded-lg shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              📋 {sectionName} - {selectedDirector}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {sectionQuestions.length} questions in this section for {selectedDirector}'s team
            </p>
          </div>
              
          <div className="p-6 space-y-8">
            {sectionQuestions.map((question, index) => {
              const questionTrends = allTrends[question]
              const isLoaded = loadedQuestions.has(question)
              
              return (
                <div key={question} className="border-l-4 border-blue-200 pl-6 py-4">
                  {/* Question Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 leading-relaxed">
                          <span className="text-blue-600 font-semibold mr-2">
                            Q{index + 1}.
                          </span>
                          {question}
                        </h4>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {trendsLoading && !isLoaded && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                            <span className="text-xs">Loading...</span>
        </div>
      )}
                        {isLoaded && (
                          <span className="text-xs text-green-600 font-medium">✅ Loaded</span>
                        )}
                        {!trendsLoading && !isLoaded && (
                          <span className="text-xs text-gray-400">⏳ Queued</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trend Chart or Table */}
                  {questionTrends ? (
                    isTableQuestion(question) ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="mb-3">
                          <h5 className="text-md font-medium text-gray-800">
                            {(() => {
                              // Dynamic headers based on question type
                              if (question.includes("action item")) {
                                return "Unique Action Items and Resolutions"
                              } else if (question.includes("Jira")) {
                                return "Jira Enhancement Suggestions"
                              } else if (question.includes("Cursor") || question.includes("ChatGPT") || question.includes("Copilot")) {
                                return "AI Tool Feedback and Usage"
                              } else if (question.includes("engagement area")) {
                                return "Engagement Areas Outside Release Deliverables"
                              } else if (question.includes("suggestion") || question.includes("improving")) {
                                return "Improvement Suggestions"
                              } else if (question.includes("thought")) {
                                return "Additional Thoughts and Feedback"
                              } else {
                                return "Unique Responses"
                              }
                            })()}
                          </h5>
                          <p className="text-xs text-gray-600">
                            Showing unique responses from latest release for {selectedDirector}'s team
                          </p>
                        </div>
                        {(() => {
                          const uniqueAnswers = getUniqueAnswersFromTrends(questionTrends, question)
                          const currentPage = getCurrentPage(question)
                          const itemsPerPage = 10
                          const totalPages = Math.ceil(uniqueAnswers.length / itemsPerPage)
                          const startIndex = currentPage * itemsPerPage
                          const endIndex = startIndex + itemsPerPage
                          const currentPageAnswers = uniqueAnswers.slice(startIndex, endIndex)
                          
                          if (uniqueAnswers.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <p>No responses found for this question from {selectedDirector}'s team</p>
                              </div>
                            )
                          }

                          // Generate AI summary
                          const aiSummary = generateAISummary(uniqueAnswers, question)

                          return (
            <div>
                              {/* AI Summary Section */}
                              <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h6 className="text-md font-semibold text-purple-900 flex items-center gap-2">
                                    🤖 AI Summary & Insights ({selectedDirector})
                                  </h6>
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                    Director Analysis
                                  </span>
                                </div>
                                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                  {aiSummary}
                                </div>
                              </div>
                              {/* Pagination Info */}
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-xs text-gray-600">
                                  Showing {startIndex + 1}-{Math.min(endIndex, uniqueAnswers.length)} of {uniqueAnswers.length} responses from latest release
                                  <span className="ml-2 text-blue-600">(Sorted by answer length)</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Page {currentPage + 1} of {totalPages}
                                </div>
                              </div>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="text-left p-3 font-medium text-gray-700">
                                        {(() => {
                                          // Dynamic column headers based on question type
                                          if (question.includes("action item")) {
                                            return "Action Item & Resolution"
                                          } else if (question.includes("Jira")) {
                                            return "Jira Enhancement Suggestion"
                                          } else if (question.includes("Cursor") || question.includes("ChatGPT") || question.includes("Copilot")) {
                                            return "AI Tool Feedback/Usage"
                                          } else if (question.includes("engagement area")) {
                                            return "Engagement Area"
                                          } else if (question.includes("suggestion") || question.includes("improving")) {
                                            return "Improvement Suggestion"
                                          } else if (question.includes("thought")) {
                                            return "Thought/Feedback"
                                          } else {
                                            return "Response"
                                          }
                                        })()}
                                      </th>
                                      <th className="text-left p-3 font-medium text-gray-700">Release</th>
                                      <th className="text-left p-3 font-medium text-gray-700">Responses</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {currentPageAnswers.map((item, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3 border-t border-gray-200">
                                          <div className="max-w-md">
                                            <p className="text-gray-900 leading-relaxed">{item.answer}</p>
                                          </div>
                                        </td>
                                        <td className="p-3 border-t border-gray-200">
                                          <div className="flex flex-wrap gap-1">
                                            {item.months.map((month) => (
                                              <span 
                                                key={month}
                                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                              >
                                                {month}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="p-3 border-t border-gray-200 text-center">
                                          <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                                            {item.totalResponses}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* Pagination Controls */}
                              {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                  <button
                                    onClick={() => setQuestionPage(question, Math.max(0, currentPage - 1))}
                                    disabled={currentPage === 0}
                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Previous
                                  </button>
                                  
                                  <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                      let pageNum
                                      if (totalPages <= 5) {
                                        pageNum = i
                                      } else if (currentPage < 3) {
                                        pageNum = i
                                      } else if (currentPage >= totalPages - 3) {
                                        pageNum = totalPages - 5 + i
                                      } else {
                                        pageNum = currentPage - 2 + i
                                      }
                                      
                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => setQuestionPage(question, pageNum)}
                                          className={`px-2 py-1 text-xs rounded ${
                                            pageNum === currentPage
                                              ? 'bg-blue-500 text-white'
                                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                          }`}
                                        >
                                          {pageNum + 1}
                                        </button>
                                      )
                                    })}
                                  </div>
                                  
                                  <button
                                    onClick={() => setQuestionPage(question, Math.min(totalPages - 1, currentPage + 1))}
                                    disabled={currentPage === totalPages - 1}
                                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Next
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    ) : (
                      // Regular trend chart
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="mb-3">
                          <h5 className="text-md font-medium text-gray-800">
                            Trend Analysis - {selectedDirector}
                          </h5>
                          <p className="text-xs text-gray-600">
                            Shows responses from {selectedDirector}'s team only. Hover over data points to see counts.
                          </p>
                        </div>
                        <TrendChart
                          trends={questionTrends.trends}
                          questionTitle={question}
                          responseCounts={questionTrends.responseCounts}
                          rawCounts={questionTrends.rawCounts}
                        />
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-gray-400 text-4xl mb-2">📊</div>
                      <p className="text-sm">
                        {trendsLoading && !isLoaded ? 
                          'Loading trend data...' : 
                          !trendsLoading && !isLoaded ? 
                            'Waiting to load...' : 
                            'No trend data available'
                        }
              </p>
            </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* No Director Selected State */}
      {!selectedDirector && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Director</h3>
          <p className="text-gray-600">
            Choose a director from the dropdown above to view their team's response trends across all questions.
          </p>
        </div>
      )}
    </div>
  )
}