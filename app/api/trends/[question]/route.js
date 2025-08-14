import { NextResponse } from 'next/server';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Load retrospective data from the current directory
function loadRetrospectiveData() {
  const data = {}
  
  // Check both current directory and Retrospectives subfolder
  const directories = ['.', './Retrospectives']
  
  for (const dir of directories) {
    try {
      const files = fs.readdirSync(path.join(process.cwd(), dir))
      
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Retrospective') &&
        !file.includes('~$') // Exclude temporary Excel files
      )
      
      for (const file of excelFiles) {
        try {
          const month = file.split(' ')[0]
          const filePath = path.join(process.cwd(), dir, file)
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Get the full range of the worksheet to read ALL columns
          const range = XLSX.utils.decode_range(worksheet['!ref'])
          
          // Read ALL column headers from the first row
          const allHeaders = []
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }) // Row 1 (0-indexed)
            const cell = worksheet[cellAddress]
            const headerText = cell && cell.v ? cell.v.toString() : `Column_${XLSX.utils.encode_col(col)}`
            allHeaders.push(headerText)
          }
          
          // Try to read data with all headers
          let jsonData = []
          try {
            const options = { 
              header: allHeaders, 
              range: 1, // Start from row 2 (0-indexed)
              defval: '', // Default value for empty cells
              raw: false // Convert values to appropriate types
            }
            jsonData = XLSX.utils.sheet_to_json(worksheet, options)
          } catch (error) {
            jsonData = XLSX.utils.sheet_to_json(worksheet)
          }
          
          // If month already exists, append data (in case of duplicates)
          if (data[month]) {
            data[month] = [...data[month], ...jsonData]
          } else {
            data[month] = jsonData
          }
        } catch (error) {
          console.error(`Error loading ${file}:`, error.message)
        }
      }
    } catch (error) {
      // Directory might not exist, continue to next one
      console.log(`Directory ${dir} not accessible, skipping...`)
    }
  }
  
  return data
}

// Extract month order for proper sorting
function extractMonthOrder(monthName) {
  const monthMapping = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return monthMapping[monthName] || 13;
}

// Analyze trends for a specific question
function analyzeQuestionTrends(data, questionColumn) {
  const trends = {}
  const responseCounts = {}
  
  // Get all months from the data
  const allMonths = Object.keys(data)
  
  for (const month of allMonths) {
    const df = data[month]
    
    if (df.length > 0) {
      // Try exact match first
      let questionKey = questionColumn
      
      // If exact match fails, try to find a similar column
      if (!df[0].hasOwnProperty(questionKey)) {
        // Look for columns that contain the question text
        const availableColumns = Object.keys(df[0])
        
        // First try: exact match
        let matchingColumn = availableColumns.find(col => col === questionKey)
        
        // Second try: contains the question text (more flexible)
        if (!matchingColumn) {
          // Split question into key phrases and look for partial matches
          const questionPhrases = [
            'capacity',
            'process changes',
            'processes enablement',
            'DEV or QA Resources',
            'Not Applicable',
            'EM',
            'SM',
            'Other Folks',
            'process streamlining'
          ]
          
          matchingColumn = availableColumns.find(col => 
            questionPhrases.some(phrase => 
              col.toLowerCase().includes(phrase.toLowerCase())
            )
          )
        }
        
        // Third try: find the most similar column by text similarity
        if (!matchingColumn) {
          let bestMatch = null
          let bestScore = 0
          
          for (const col of availableColumns) {
            const colLower = col.toLowerCase()
            const questionLower = questionKey.toLowerCase()
            
            // Simple similarity score based on common words
            const colWords = colLower.split(/\s+/)
            const questionWords = questionLower.split(/\s+/)
            const commonWords = colWords.filter(word => questionWords.includes(word))
            const score = commonWords.length / Math.max(colWords.length, questionWords.length)
            
            if (score > bestScore) {
              bestScore = score
              bestMatch = col
            }
          }
          
          if (bestScore > 0.3) { // Threshold for similarity
            matchingColumn = bestMatch
          }
        }
        
        if (matchingColumn) {
          questionKey = matchingColumn
        }
      }
      
      if (df[0].hasOwnProperty(questionKey)) {
        // Count responses for each answer option
        const answerCounts = {}
        df.forEach(row => {
          const answer = row[questionKey]
          if (answer !== undefined && answer !== null && answer !== '') {
            answerCounts[answer] = (answerCounts[answer] || 0) + 1
          }
        })
        
        trends[month] = answerCounts
        responseCounts[month] = df.length
      } else {
        trends[month] = {}
        responseCounts[month] = 0
      }
    } else {
      trends[month] = {}
      responseCounts[month] = 0
    }
  }
  
  return { trends, responseCounts }
}

export async function GET(request, { params }) {
  try {
    const { question } = params
    
    if (!question) {
      return NextResponse.json({ error: 'Question parameter is required' }, { status: 400 })
    }
    
    const data = loadRetrospectiveData()
    
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }
    
    const { trends, responseCounts } = analyzeQuestionTrends(data, question)
    
    // Get all months and sort them
    const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
    
    const result = {
      question,
      trends,
      responseCounts,
      months: allMonths
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 