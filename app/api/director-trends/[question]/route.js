import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

function extractMonthOrder(monthName) {
  const monthMapping = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  
  // Handle "Month Year" format
  const parts = monthName.split(' ')
  const month = parts[0]
  const year = parts[1] ? parseInt(parts[1]) : 2024 // Default year for backward compatibility
  
  const monthOrder = monthMapping[month] || 13
  
  // Create a sortable number: YYYYMM format
  return year * 100 + monthOrder
}

function loadRetrospectiveData() {
  console.log('🔍 VERCEL DEBUGGING: Starting to load retrospective data for director trends...')
  console.log('🔍 VERCEL DEBUGGING: Environment variables:')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('  - VERCEL:', process.env.VERCEL)
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV)
  console.log('  - Current working directory:', process.cwd())
  
  const data = {}
  
  // Enhanced directory checking for Vercel
  let directories = []
  
  if (process.env.VERCEL) {
    // In Vercel, try multiple potential locations
    directories = ['./Retrospectives', './public/Retrospectives', 'Retrospectives', 'public/Retrospectives']
  } else {
    // Local development
    directories = ['.', './Retrospectives']
  }

  // Use different path resolution based on environment
  let projectRoot
  if (process.env.VERCEL) {
    projectRoot = process.cwd()
  } else {
    projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..')
  }

  console.log('🔍 VERCEL DEBUGGING: Project root:', projectRoot)
  console.log('🔍 VERCEL DEBUGGING: Directories to check:', directories)

  for (const dir of directories) {
    try {
      const fullPath = path.join(projectRoot, dir)
      console.log(`🔍 VERCEL DEBUGGING: Checking directory: ${fullPath}`)
      
      if (!fs.existsSync(fullPath)) {
        console.log(`🔍 VERCEL DEBUGGING: Directory ${fullPath} does not exist, skipping...`)
        continue
      }
      
      const files = fs.readdirSync(fullPath)
      console.log(`🔍 VERCEL DEBUGGING: Files in ${dir}:`, files.length > 0 ? files.slice(0, 10) : 'No files found')
      
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Release Retrospective') &&
        !file.includes('~$') // Exclude temporary Excel files
      )
      console.log(`🔍 VERCEL DEBUGGING: Excel files found in ${dir}:`, excelFiles)
      
      if (excelFiles.length === 0) {
        console.log(`🔍 VERCEL DEBUGGING: No Excel files found in ${dir}, continuing to next directory...`)
        continue
      }
      
      // Sort files chronologically before processing
      const sortedFiles = excelFiles.sort((a, b) => {
        const extractFileOrder = (filename) => {
          const parts = filename.split(' ')
          const month = parts[0]
          const year = parts[1] ? parseInt(parts[1]) : 2024
          const monthMapping = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
          }
          const monthOrder = monthMapping[month] || 13
          return year * 100 + monthOrder
        }
        return extractFileOrder(a) - extractFileOrder(b)
      })
      
      for (const file of sortedFiles) {
        try {
          const filePath = path.join(fullPath, file)
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
          const allHeaders = []
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
            const cell = worksheet[cellAddress]
            const headerText = cell && cell.v ? cell.v.toString() : `Column_${XLSX.utils.encode_col(col)}`
            allHeaders.push(headerText)
          }
          
          const options = { 
            header: allHeaders, 
            range: 1,
            defval: '',
            raw: false
          }
          const jsonData = XLSX.utils.sheet_to_json(worksheet, options)
          
          // Extract month and year to handle multiple files for same month
          const parts = file.split(' ')
          const month = parts[0]
          const year = parts[1]
          const monthKey = year ? `${month} ${year}` : month
          if (data[monthKey]) {
            data[monthKey] = [...data[monthKey], ...jsonData]
          } else {
            data[monthKey] = jsonData
          }
        } catch (error) {
          console.error(`🔍 VERCEL DEBUGGING: Error loading ${file}:`, error.message)
          if (process.env.VERCEL) {
            console.log(`🔍 VERCEL DEBUGGING: Vercel file access error for ${file} - this may be expected in serverless environment`)
          }
        }
      }
      
      // If we found files in this directory, break (prioritize first working directory)
      if (excelFiles.length > 0) {
        console.log(`🔍 VERCEL DEBUGGING: Successfully loaded ${excelFiles.length} files from ${dir}, stopping search`)
        break
      }
    } catch (error) {
      console.log(`🔍 VERCEL DEBUGGING: Directory ${dir} not accessible:`, error.message)
    }
  }
  
  console.log(`🔍 VERCEL DEBUGGING: Final data keys:`, Object.keys(data))
  return data
}

function analyzeDirectorQuestionTrends(data, questionColumn, targetDirector) {
  const trends = {}
  const responseCounts = {}
  
  console.log(`Analyzing director trends for: "${targetDirector}" on question: "${questionColumn}"`)
  
  const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
  
  for (const month of allMonths) {
    const df = data[month]
    console.log(`Processing month: ${month}, data length: ${df.length}`)
    
    if (df.length > 0) {
      // Find director column
      const directorColumn = Object.keys(df[0]).find(col => 
        col === 'You are part of which of the following directors org'
      )
      
      if (!directorColumn) {
        console.log(`No director column found in ${month}`)
        continue
      }
      
      // Try exact match first for question
      let questionKey = questionColumn
      
      if (!df[0].hasOwnProperty(questionKey)) {
        const availableColumns = Object.keys(df[0])
        
        // Specialized matching for AI productivity question
        if (questionKey.includes('With the usage of AI what has been increase in your productivity')) {
          const matchingColumn = availableColumns.find(col => 
            col.includes('With the usage of AI what has been increase in your productivity')
          )
          if (matchingColumn) {
            questionKey = matchingColumn
            console.log(`Found AI productivity variant for ${month}: "${questionKey}"`)
          }
        }
        
        // General fallback matching
        if (!availableColumns.includes(questionKey)) {
          const questionWords = questionKey.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3)
          
          const matchingColumn = availableColumns.find(col => {
            if (col === 'Timestamp') return false
            
            const colLower = col.toLowerCase()
            const matchingWords = questionWords.filter(word => colLower.includes(word))
            const minWordMatch = Math.ceil(questionWords.length * 0.3)
            return matchingWords.length >= minWordMatch
          })
          
          if (matchingColumn) {
            questionKey = matchingColumn
            console.log(`Found matching column for ${month}: "${questionKey}"`)
          } else {
            console.log(`No matching column found for ${month}`)
            trends[month] = {}
            responseCounts[month] = 0
            continue
          }
        }
      }
      
      // Filter responses for the target director
      const directorResponses = df.filter(response => 
        response[directorColumn] === targetDirector
      )
      
      console.log(`Director ${targetDirector} responses in ${month}: ${directorResponses.length}`)
      
      if (directorResponses.length === 0) {
        trends[month] = {}
        responseCounts[month] = 0
        continue
      }
      
      // Get value counts and calculate percentages
      const valueCounts = {}
      let totalResponses = 0
      
      for (const response of directorResponses) {
        const value = response[questionKey]
        if (value && value !== '') {
          valueCounts[value] = (valueCounts[value] || 0) + 1
          totalResponses++
        }
      }
      
      // Convert counts to percentages
      const percentages = {}
      for (const [value, count] of Object.entries(valueCounts)) {
        percentages[value] = (count / totalResponses) * 100
      }
      
      trends[month] = percentages
      responseCounts[month] = totalResponses
      
      console.log(`Processed ${month}: ${totalResponses} responses, ${Object.keys(percentages).length} answer types`)
    }
  }
  
  return { trends, responseCounts }
}

export async function GET(request, { params }) {
  try {
    const { question } = params
    const { searchParams } = new URL(request.url)
    const director = searchParams.get('director')
    
    if (!director) {
      return NextResponse.json({ error: 'Director parameter is required' }, { status: 400 })
    }
    
    console.log(`Director trends API called for question: "${question}", director: "${director}"`)
    
    // Try server first in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const serverResponse = await fetch(`http://localhost:4005/api/director-trends/${encodeURIComponent(question)}?director=${encodeURIComponent(director)}`)
        if (serverResponse.ok) {
          const serverData = await serverResponse.json()
          console.log('Successfully got director trends from server')
          return NextResponse.json(serverData)
        }
      } catch (error) {
        console.log('Could not fetch from server:', error.message)
      }
    }
    
    // Fallback: read files directly
    const data = loadRetrospectiveData()
    
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ 
        error: 'No retrospective data found',
        trends: {},
        responseCounts: {},
        summaryData: [],
        question: question
      })
    }
    
    const { trends, responseCounts } = analyzeDirectorQuestionTrends(data, question, director)
    
    // Create summary data for the chart and sorted trends object
    const summaryData = []
    const sortedTrends = {}
    const sortedMonths = Object.keys(trends).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
    
    for (const month of sortedMonths) {
      const monthTrends = trends[month]
      sortedTrends[month] = monthTrends // Add to sorted trends object
      
      for (const [answer, percentage] of Object.entries(monthTrends)) {
        summaryData.push({
          Month: month,
          Answer: answer,
          Percentage: percentage
        })
      }
    }
    
    console.log(`Director trends analysis complete. Months: ${sortedMonths.length}, Total data points: ${summaryData.length}`)
    
    return NextResponse.json({
      trends: sortedTrends,
      responseCounts,
      summaryData,
      question: question,
      director: director
    })
    
  } catch (error) {
    console.error('Error in director trends API:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze director trends',
      trends: {},
      responseCounts: {},
      summaryData: [],
      question: params.question || 'Unknown'
    }, { status: 500 })
  }
}