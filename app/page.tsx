'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, BarChart3, Download } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import QuestionSelector from '@/components/QuestionSelector'
import TrendChart from '@/components/TrendChart'
import ResponseChart from '@/components/ResponseChart'
import DirectorAnalysisTable from '@/components/DirectorAnalysisTable'
import DirectorTrendAnalysis from '@/components/DirectorTrendAnalysis'


import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Label } from 'recharts'

interface SummaryData {
  Month: string
  Answer: string
  Percentage: number
}

interface Summary {
  totalResponses: number
  totalQuestions: number
  averageResponseRate: number
}

interface TrendsData {
  trends: Record<string, Record<string, number>>
  responseCounts: Record<string, number>
  summaryData: SummaryData[]
  question: string
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary>({
    totalResponses: 0,
    totalQuestions: 0,
    averageResponseRate: 0
  })
  const [questionCategories, setQuestionCategories] = useState<{ [key: string]: string[] }>({})
  const [orderedQuestions, setOrderedQuestions] = useState<string[]>([])
  const [sections, setSections] = useState<{ [key: string]: string[] }>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('All Sections')
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [releaseData, setReleaseData] = useState<Array<{month: string, responses: number, questions: number}>>([])
  const [directorAnalysis, setDirectorAnalysis] = useState<any>(null)
  const loadingRef = useRef(loading)
  const [testData, setTestData] = useState<string>('Not loaded')
  const [activeTab, setActiveTab] = useState<'overview' | 'director'>('overview')

  useEffect(() => {
    console.log('useEffect triggered, starting data fetch...')
    fetchData()
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Timeout reached, current loading state:', loadingRef.current)
      if (loadingRef.current) {
        console.log('Loading timeout reached, setting loading to false')
        setLoading(false)
        // Set default values
        setSummary({ totalResponses: 0, totalQuestions: 0, averageResponseRate: 0 })
        setQuestionCategories({})
        setOrderedQuestions([])
        setReleaseData([])
      }
    }, 10000) // Reduced to 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      loadingRef.current = true
      console.log('Starting to fetch data...')
      
      // Fetch summary data
      console.log('Fetching summary data...')
      const summaryResponse = await fetch('/api/summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })
      console.log('Summary response status:', summaryResponse.status)
      if (!summaryResponse.ok) {
        throw new Error(`Summary API failed: ${summaryResponse.status}`)
      }
      const summaryData = await summaryResponse.json()
      console.log('Summary data received:', summaryData)
      console.log('Summary data keys:', Object.keys(summaryData))
      console.log('Total responses value:', summaryData.totalResponses)
      console.log('Setting summary data...')
      setSummary(summaryData)
      console.log('Summary state set')

      // Fetch available questions from all releases
      console.log('Fetching all unique questions data...')
      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:4005' 
        : '';
      
      const questionsResponse = await fetch(`${apiBaseUrl}/api/all-questions`)
      if (!questionsResponse.ok) {
        throw new Error(`All questions API failed: ${questionsResponse.status}`)
      }
      const questionsData = await questionsResponse.json()
      console.log('All questions data received:', questionsData)
      console.log('Sections data:', questionsData.sections)
      
      // Set questions and sections data
      setQuestionCategories({}) // Clear categories since we're using sections
      setOrderedQuestions(questionsData.questions || [])
      setSections(questionsData.sections || {})
      
      // Fetch release data for the new chart (environment-aware)
      console.log('Fetching releases data...')
      const releasesResponse = await fetch(`${apiBaseUrl}/api/releases`)
      if (!releasesResponse.ok) {
        throw new Error(`Releases API failed: ${releasesResponse.status}`)
      }
      const releasesData = await releasesResponse.json()
      console.log('Release data loaded from Node.js server:', releasesData)
      console.log('✅ CORRECT ORDER: First release:', releasesData[0]?.month, 'Last release:', releasesData[releasesData.length-1]?.month)
      // The releases API returns an array directly, not an object with a releases property
      setReleaseData(Array.isArray(releasesData) ? releasesData : [])

      console.log('All data fetched successfully')
      console.log('Setting loading to false...')
      setLoading(false)
      loadingRef.current = false
      console.log('Loading state set to false')
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
      loadingRef.current = false
      // Set default values to prevent infinite loading
      setSummary({ totalResponses: 0, totalQuestions: 0, averageResponseRate: 0 })
      setQuestionCategories({})
      setOrderedQuestions([])
      setReleaseData([])
    }
  }

  const handleRefresh = async () => {
    try {
      setLoading(true)
      loadingRef.current = true
      console.log('🔄 Refreshing data from server...')
      
      // First, call the refresh endpoint to reload Excel files
      const refreshResponse = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh data from server')
      }
      
      const refreshResult = await refreshResponse.json()
      console.log('✅ Server data refreshed:', refreshResult)
      
      // Then reload the frontend data
      await fetchData()
      
      alert(`Data refreshed successfully! 
📁 Files loaded: ${refreshResult.summary.filesLoaded}
📊 Total responses: ${refreshResult.summary.totalResponses}
⏱️ Load time: ${refreshResult.summary.loadTime}ms`)
      
    } catch (error) {
      console.error('❌ Refresh failed:', error)
      alert('Refresh failed. Please try again.')
      setLoading(false)
      loadingRef.current = false
    }
  }

  const handleQuestionChange = async (question: string) => {
    if (!question) return
    
    try {
      setLoading(true)
      
      // Environment-aware API base URL
      const apiBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:4005' 
        : '';
      
      // Fetch trends data (environment-aware)
      const trendsResponse = await fetch(`${apiBaseUrl}/api/trends/${encodeURIComponent(question)}`)
      if (!trendsResponse.ok) {
        throw new Error(`Trends API failed: ${trendsResponse.status}`)
      }
      const trendsData = await trendsResponse.json()
      console.log('✅ TRENDS DATA from server:', trendsData)
      setTrends(trendsData)
      
      // Fetch director analysis data (environment-aware)
      const directorResponse = await fetch(`${apiBaseUrl}/api/director-analysis/${encodeURIComponent(question)}`)
      if (!directorResponse.ok) {
        throw new Error(`Director API failed: ${directorResponse.status}`)
      }
      const directorData = await directorResponse.json()
      console.log('✅ DIRECTOR DATA from server:', directorData)
      setDirectorAnalysis(directorData)
      
      setSelectedQuestion(question)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setTrends(null)
      setDirectorAnalysis(null)
      setLoading(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedQuestion('')
    setTrends(null)
  }

  const handleSectionChange = (section: string) => {
    setSelectedSection(section)
    setSelectedQuestion('')
    setTrends(null)
    console.log('Section changed to:', section)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
            <p className="mt-2 text-sm text-gray-500">This may take a few moments on first load</p>
            <p className="mt-2 text-xs text-gray-400">Debug: Total Responses = {summary.totalResponses}</p>
            <p className="mt-1 text-xs text-gray-400">Debug: Questions Length = {orderedQuestions.length}</p>
            <p className="mt-1 text-xs text-gray-400">Debug: Loading State = {loading.toString()}</p>
            <p className="mt-1 text-xs text-gray-400">Debug: Test Data = {testData}</p>
            <button 
              onClick={() => {
                console.log('Manual refresh clicked')
                fetchData()
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button 
              onClick={() => {
                console.log('Force stop loading clicked')
                setLoading(false)
              }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Force Stop Loading
            </button>
            <button 
              onClick={async () => {
                console.log('Quick test API clicked')
                try {
                  const response = await fetch('/api/summary')
                  const data = await response.json()
                  setTestData(`Loaded: ${data.totalResponses} responses`)
                  console.log('Quick test data:', data)
                } catch (error) {
                  setTestData(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                  console.error('Quick test error:', error)
                }
              }}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Quick Test API
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Release Retrospective Analysis
              {selectedQuestion && <span className="text-blue-600 text-2xl ml-3">• Question Focus Mode</span>}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedQuestion 
                ? 'Focused analysis on selected question' 
                : 'Analyze trends and insights across release retrospectives'
              }
            </p>
            {selectedQuestion && (
              <div className="mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  📊 Dashboard → 
                  <span className="text-blue-600 font-medium">{selectedCategory || 'All Questions'}</span> → 
                  <span className="text-blue-800 font-medium">Question Analysis</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/export-all-ppt', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  })
                  
                  if (!response.ok) {
                    throw new Error('Export failed')
                  }
                  
                  // Create blob and download
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Complete_Retrospective_Analysis_${new Date().toISOString().split('T')[0]}.pptx`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                } catch (error) {
                  console.error('Export failed:', error)
                  alert('Export failed. Please try again.')
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All to PPT
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                loading 
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-3 px-6 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Overview Analysis
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`flex-1 py-3 px-6 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'director'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              👥 Director Analysis
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Metrics */}
        <div className="flex justify-center mb-8">
          <MetricCard
            icon={BarChart3}
            title="Total Releases"
            value={(releaseData?.length || 0).toString()}
            color="blue"
          />
        </div>



        {/* Release Responses Chart - Hide when question is selected */}
        {!selectedQuestion && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Total Responses by Release</h2>
            {releaseData && releaseData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={releaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(value) => {
                    const yearMap: { [key: string]: string } = {
                      'August': 'Aug 2024',
                      'September': 'Sep 2024', 
                      'November': 'Nov 2024',
                      'January': 'Jan 2025',
                      'March': 'Mar 2025',
                      'April': 'Apr 2025',
                      'May': 'May 2025',
                      'July': 'Jul 2025'
                    }
                    return yearMap[value] || value
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} responses`,
                    name === 'responses' ? 'Total Responses' : name
                  ]}
                  labelFormatter={(label: string) => {
                    const yearMap: { [key: string]: string } = {
                      'August': 'Aug 2024',
                      'September': 'Sep 2024', 
                      'November': 'Nov 2024',
                      'January': 'Jan 2025',
                      'March': 'Mar 2025',
                      'April': 'Apr 2025',
                      'May': 'May 2025',
                      'July': 'Jul 2025'
                    }
                    return yearMap[label] || label
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const yearMap: { [key: string]: string } = {
                        'August': 'Aug 2024',
                        'September': 'Sep 2024', 
                        'November': 'Nov 2024',
                        'January': 'Jan 2025',
                        'March': 'Mar 2025',
                        'April': 'Apr 2025',
                        'May': 'May 2025',
                        'July': 'Jul 2025'
                      }
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900">{yearMap[label] || label}</p>
                          <p className="text-blue-600">Total Responses: {data.responses}</p>
                          <p className="text-green-600">Total Questions: {data.questions}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="responses" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                >
                  <LabelList 
                    dataKey="questions" 
                    position="bottom" 
                    formatter={(value: number, entry: any) => {
                      // Find the corresponding data point to get responses count
                      const dataPoint = (releaseData || []).find((item: any) => item.questions === value);
                      if (dataPoint) {
                        return `${dataPoint.responses}(Q:${value})`;
                      }
                      return `Q:${value}`;
                    }}
                    style={{ fontSize: '11px', fill: '#000000', fontWeight: 'bold' }}
                    offset={15}
                  />
                </Line>



              </LineChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500">Loading release data...</p>
            </div>
          )}
          </div>
        )}

        {/* Question Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedQuestion ? 'Question Analysis' : 'Select Question for Analysis'}
            </h2>
            {selectedQuestion && (
              <button
                onClick={() => {
                  setSelectedQuestion('')
                  setSelectedCategory('')
                  setTrends(null)
                  setDirectorAnalysis(null)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Overview
              </button>
            )}
          </div>
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

        {/* Selected Question Display */}
        {selectedQuestion && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">📊 Analyzing Question</h2>
            <p className="text-blue-800 text-lg leading-relaxed font-medium">{selectedQuestion}</p>
          </div>
        )}

        {/* Trend Analysis Chart */}
        {trends && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Trend Analysis</h2>
            <TrendChart
              trends={trends.trends}
              questionTitle={selectedQuestion}
              responseCounts={trends.responseCounts}
            />
          </div>
        )}

        {/* Director Analysis Table */}
        {directorAnalysis && (
          <div className="mb-8">
            <DirectorAnalysisTable
              question={directorAnalysis.question}
              releases={directorAnalysis.releases}
            />
            
            {/* Export Button */}
            <div className="mt-6 text-center">
              <button
                onClick={async () => {
                  if (trends && directorAnalysis) {
                    try {
                      const response = await fetch('/api/export-ppt', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          question: directorAnalysis.question,
                          trends,
                          directorAnalysis
                        })
                      })
                      
                      if (!response.ok) {
                        throw new Error('Export failed')
                      }
                      
                      // Create blob and download
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `Retrospective_Analysis_${directorAnalysis.question.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.pptx`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } catch (error) {
                      console.error('Export failed:', error)
                      alert('Export failed. Please try again.')
                    }
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mx-auto"
                disabled={!trends || !directorAnalysis}
              >
                <Download className="w-5 h-5" />
                Export as PPT
              </button>
            </div>


          </div>
        )}
        </>
        )}

        {/* Director Analysis Tab */}
        {activeTab === 'director' && (
          <DirectorTrendAnalysis
            questionCategories={questionCategories}
            orderedQuestions={orderedQuestions}
            sections={sections}
          />
        )}

      </div>
    </div>
  )
} 