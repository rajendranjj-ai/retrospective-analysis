'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, BarChart3, Download } from 'lucide-react'
import MetricCard from '@/components/MetricCard'
import QuestionSelector from '@/components/QuestionSelector'
import TrendChart from '@/components/TrendChart'
import ResponseChart from '@/components/ResponseChart'
import DirectorAnalysisTable from '@/components/DirectorAnalysisTable'


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
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedQuestion, setSelectedQuestion] = useState<string>('')
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [releaseData, setReleaseData] = useState<Array<{month: string, responses: number, questions: number}>>([])
  const [directorAnalysis, setDirectorAnalysis] = useState<any>(null)

  useEffect(() => {
    fetchData()
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, setting loading to false')
        setLoading(false)
        // Set default values
        setSummary({ totalResponses: 0, totalQuestions: 0, averageResponseRate: 0 })
        setQuestionCategories({})
        setOrderedQuestions([])
        setReleaseData([])
      }
    }, 30000) // 30 second timeout
    
    return () => clearTimeout(timeout)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Starting to fetch data...')
      
      // Fetch summary data
      console.log('Fetching summary data...')
      const summaryResponse = await fetch('/api/summary')
      if (!summaryResponse.ok) {
        throw new Error(`Summary API failed: ${summaryResponse.status}`)
      }
      const summaryData = await summaryResponse.json()
      console.log('Summary data received:', summaryData)
      setSummary(summaryData)

      // Fetch available questions
      console.log('Fetching questions data...')
      const questionsResponse = await fetch('/api/questions')
      if (!questionsResponse.ok) {
        throw new Error(`Questions API failed: ${questionsResponse.status}`)
      }
      const questionsData = await questionsResponse.json()
      console.log('Questions data received:', questionsData)
      setQuestionCategories(questionsData.categories || {})
      setOrderedQuestions(questionsData.orderedQuestions || [])
      
      // Fetch release data for the new chart
      console.log('Fetching releases data...')
      const releasesResponse = await fetch('/api/releases')
      if (!releasesResponse.ok) {
        throw new Error(`Releases API failed: ${releasesResponse.status}`)
      }
      const releasesData = await releasesResponse.json()
      console.log('Release data loaded:', releasesData)
      setReleaseData(releasesData.releases || [])

      console.log('All data fetched successfully')
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
      // Set default values to prevent infinite loading
      setSummary({ totalResponses: 0, totalQuestions: 0, averageResponseRate: 0 })
      setQuestionCategories({})
      setOrderedQuestions([])
      setReleaseData([])
    }
  }

  const handleRefresh = () => {
    fetchData()
  }

  const handleQuestionChange = async (question: string) => {
    if (!question) return
    
    try {
      setLoading(true)
      
      // Fetch trends data
      const trendsResponse = await fetch(`/api/trends/${encodeURIComponent(question)}`)
      const trendsData = await trendsResponse.json()
      setTrends(trendsData)
      
      // Fetch director analysis data
      const directorResponse = await fetch(`/api/director-analysis/${encodeURIComponent(question)}`)
      const directorData = await directorResponse.json()
      console.log('Director analysis data received:', directorData)
      setDirectorAnalysis(directorData)
      
      setSelectedQuestion(question)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSelectedQuestion('')
    setTrends(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
            <p className="mt-2 text-sm text-gray-500">This may take a few moments on first load</p>
            <button 
              onClick={() => {
                console.log('Manual refresh clicked')
                fetchData()
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
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
            <h1 className="text-3xl font-bold text-gray-900">Release Retrospective Analysis</h1>
            <p className="text-gray-600 mt-2">Analyze trends and insights across release retrospectives</p>
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="flex justify-center mb-8">
          <MetricCard
            icon={BarChart3}
            title="Total Releases"
            value={(releaseData?.length || 0).toString()}
            color="blue"
          />
        </div>



        {/* Release Responses Chart */}
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

        {/* Question Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Question for Analysis</h2>
          <QuestionSelector
            questionCategories={questionCategories}
            orderedQuestions={orderedQuestions}
            selectedCategory={selectedCategory}
            selectedQuestion={selectedQuestion}
            onCategoryChange={handleCategoryChange}
            onQuestionChange={handleQuestionChange}
          />
        </div>

        {/* Selected Question Display */}
        {selectedQuestion && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Question</h2>
            <p className="text-gray-700 text-lg leading-relaxed">{selectedQuestion}</p>
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


      </div>
    </div>
  )
} 