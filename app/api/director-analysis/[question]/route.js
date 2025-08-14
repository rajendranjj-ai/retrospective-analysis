import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Load retrospective data from the current directory
function loadRetrospectiveData() {
  console.log('🔍 VERCEL DEBUGGING: Starting to load retrospective data for director analysis...')
  console.log('🔍 VERCEL DEBUGGING: Environment variables:')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('  - VERCEL:', process.env.VERCEL)
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV)
  console.log('  - Current working directory:', process.cwd())
  
  const data = {}
  
  // Enhanced directory checking for Vercel
  let directories = []
  
  if (process.env.VERCEL) {
    // Vercel environment: try multiple paths
    directories = ['public/Retrospectives', './public/Retrospectives', 'Retrospectives', './Retrospectives']
    console.log('🔍 VERCEL DEBUGGING: Using Vercel-optimized directory search order')
  } else {
    // Local development
    directories = ['.', './Retrospectives']
    console.log('🔍 VERCEL DEBUGGING: Using local development directory search')
  }
  
  console.log('🔍 VERCEL DEBUGGING: Will check directories in order:', directories)
  
  for (const dir of directories) {
    try {
      const fullPath = path.join(process.cwd(), dir)
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
      
      for (const file of excelFiles) {
        try {
          console.log(`🔍 VERCEL DEBUGGING: Processing file: ${file}`)
          // Extract month and year to handle multiple files for same month
          const parts = file.split(' ')
          const month = parts[0]
          const year = parts[1]
          const monthKey = year ? `${month} ${year}` : month
          const filePath = path.join(fullPath, file)
          console.log(`🔍 VERCEL DEBUGGING: File path: ${filePath}`)
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
          if (data[monthKey]) {
            data[monthKey] = [...data[monthKey], ...jsonData]
          } else {
            data[monthKey] = jsonData
          }
          console.log(`🔍 VERCEL DEBUGGING: Loaded ${monthKey}: ${jsonData.length} responses from ${file}`)
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
      // Directory might not exist, continue to next one
      console.log(`🔍 VERCEL DEBUGGING: Directory ${dir} not accessible, skipping...`, error.message)
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

// Analyze director data for a specific question
function analyzeDirectorData(data, questionColumn) {
  const directorAnalysis = {}
  
  // Get all months and sort them
  const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
  
  // Get the last 3 releases
  const lastThreeReleases = allMonths.slice(-3)
  
  for (const month of lastThreeReleases) {
    const monthData = data[month]
    
    if (monthData && monthData.length > 0) {
      // Find the director column
      let directorColumn = null
      const availableColumns = Object.keys(monthData[0])
      
      // Look for the exact director column name
      directorColumn = availableColumns.find(col => 
        col === "You are part of which of the following directors org"
      )
      
      if (!directorColumn) {
        // Try to find a similar column
        directorColumn = availableColumns.find(col => 
          col.toLowerCase().includes('director') || 
          col.toLowerCase().includes('org')
        )
      }
      
      if (directorColumn) {
        // Find the question column
        let questionKey = questionColumn
        
        if (!monthData[0].hasOwnProperty(questionKey)) {
          // Try to find a similar column
          questionKey = availableColumns.find(col => 
            col === questionKey || 
            col.toLowerCase().includes(questionKey.toLowerCase())
          ) || questionKey
        }
        
        if (monthData[0].hasOwnProperty(questionKey)) {
          // Get all unique directors
          const directors = [...new Set(monthData.map(row => row[directorColumn]).filter(Boolean))]
          
          // Get all unique answers for the question
          const answers = [...new Set(monthData.map(row => row[questionKey]).filter(Boolean))]
          
          // Initialize analysis structure
          if (!directorAnalysis[month]) {
            directorAnalysis[month] = {
              directors: directors,
              answers: answers,
              data: {}
            }
          }
          
          // Calculate percentages for each director and answer
          for (const director of directors) {
            if (!directorAnalysis[month].data[director]) {
              directorAnalysis[month].data[director] = {}
            }
            
            const directorResponses = monthData.filter(row => row[directorColumn] === director)
            const totalDirectorResponses = directorResponses.length
            
            for (const answer of answers) {
              const answerCount = directorResponses.filter(row => row[questionKey] === answer).length
              const percentage = totalDirectorResponses > 0 ? (answerCount / totalDirectorResponses) * 100 : 0
              
              directorAnalysis[month].data[director][answer] = {
                count: answerCount,
                percentage: Math.round(percentage * 100) / 100
              }
            }
          }
        }
      }
    }
  }
  
  return directorAnalysis
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
    
    const directorAnalysis = analyzeDirectorData(data, question)
    
    const result = {
      question,
      analysis: directorAnalysis
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 