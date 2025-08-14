import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { getCachedData, setCachedData } from '../cache.js';

// Load retrospective data from the current directory
function loadRetrospectiveData() {
  console.log('🔍 VERCEL DEBUGGING: Starting to load retrospective data...')
  console.log('🔍 VERCEL DEBUGGING: Environment variables:')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('  - VERCEL:', process.env.VERCEL)
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV)
  console.log('  - Current working directory:', process.cwd())
  
  const data = {}
  
  // Enhanced directory checking for Vercel
  let directories = []
  
  if (process.env.VERCEL) {
    // Vercel environment - try multiple possible locations
    directories = [
      './public/Retrospectives',
      './Retrospectives',
      'public/Retrospectives',
      'Retrospectives',
      './public',
      'public'
    ]
    console.log('🔍 VERCEL DEBUGGING: Vercel environment detected - trying multiple file locations')
  } else {
    // Local development
    directories = ['.', './Retrospectives']
    console.log('🔍 VERCEL DEBUGGING: Local environment detected')
  }
  
  console.log('🔍 VERCEL DEBUGGING: Directories to check:', directories)
  
  for (const dir of directories) {
    try {
      console.log(`Checking directory: ${dir}`)
      console.log(`Current working directory: ${process.cwd()}`)
      console.log(`Full path: ${path.join(process.cwd(), dir)}`)
      
      // Try to list files
      let files
      try {
        files = fs.readdirSync(path.join(process.cwd(), dir))
      } catch (fsError) {
        console.log(`FS error for ${dir}:`, fsError.message)
        // Try alternative paths
        const altPaths = [
          path.join(process.cwd(), '..', dir),
          path.join(process.cwd(), '..', '..', dir),
          path.join(process.cwd(), '..', '..', '..', dir)
        ]
        
        for (const altPath of altPaths) {
          try {
            console.log(`Trying alternative path: ${altPath}`)
            files = fs.readdirSync(altPath)
            console.log(`Success with alternative path: ${altPath}`)
            break
          } catch (altError) {
            console.log(`Alternative path failed: ${altPath}`, altError.message)
          }
        }
        
        if (!files) {
          console.log(`All paths failed for directory: ${dir}`)
          continue
        }
      }
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
          console.log(`🔍 VERCEL DEBUGGING: Processing file: ${file}`)
          // Extract month and year to handle multiple files for same month
          const parts = file.split(' ')
          const month = parts[0]
          const year = parts[1]
          const monthKey = year ? `${month} ${year}` : month
          const filePath = path.join(process.cwd(), dir, file)
          console.log(`🔍 VERCEL DEBUGGING: File path: ${filePath}`)
          
          // Check if file exists
          if (!fs.existsSync(filePath)) {
            console.log(`🔍 VERCEL DEBUGGING: File ${filePath} does not exist, skipping...`)
            continue
          }
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Get the full range of the worksheet to read ALL columns
          const range = XLSX.utils.decode_range(worksheet['!ref'])
          console.log(`File ${file} has range: ${worksheet['!ref']} (${range.e.c + 1} columns, ${range.e.r + 1} rows)`)
          
          // Read ALL column headers from the first row
          const allHeaders = []
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }) // Row 1 (0-indexed)
            const cell = worksheet[cellAddress]
            const headerText = cell && cell.v ? cell.v.toString() : `Column_${XLSX.utils.encode_col(col)}`
            allHeaders.push(headerText)
          }
          
          console.log(`All headers in ${file}:`, allHeaders)
          
          // Try to read data with all headers
          let jsonData = []
          try {
            // Force reading with all headers and ensure all columns are included
            const options = { 
              header: allHeaders, 
              range: 1, // Start from row 2 (0-indexed)
              defval: '', // Default value for empty cells
              raw: false // Convert values to appropriate types
            }
            jsonData = XLSX.utils.sheet_to_json(worksheet, options)
            
            // Verify we got all columns
            if (jsonData.length > 0) {
              const actualColumns = Object.keys(jsonData[0])
              if (actualColumns.length !== allHeaders.length) {
                console.log(`Warning: Expected ${allHeaders.length} columns but got ${actualColumns.length} for ${file}`)
                console.log(`Missing columns:`, allHeaders.filter(h => !actualColumns.includes(h)))
              }
            }
          } catch (error) {
            console.log(`Error reading with all headers, trying default method:`, error.message)
            jsonData = XLSX.utils.sheet_to_json(worksheet)
          }
          
          // If monthKey already exists, append data (in case of duplicates)
          if (data[monthKey]) {
            console.log(`Appending data to existing ${monthKey}: ${jsonData.length} additional responses`)
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
      if (Object.keys(data).length > 0) {
        console.log(`🔍 VERCEL DEBUGGING: Successfully loaded data from ${dir}, using this directory`)
        break
      }
      
    } catch (error) {
      // Directory might not exist, continue to next one
      console.log(`🔍 VERCEL DEBUGGING: Directory ${dir} not accessible:`, error.message)
      if (process.env.VERCEL) {
        console.log(`🔍 VERCEL DEBUGGING: Vercel directory access error for ${dir} - trying next location`)
      }
    }
  }
  
  console.log(`🔍 VERCEL DEBUGGING: Final data loading result: ${Object.keys(data).length} releases loaded`)
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

export async function GET() {
  try {
    console.log('API: Summary endpoint called')
    
    // For production/Vercel, read files directly
    // Try server first only in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const serverResponse = await fetch('http://localhost:4005/api/summary')
        if (serverResponse.ok) {
          const serverData = await serverResponse.json()
          console.log('Successfully got summary data from server')
          return NextResponse.json(serverData)
        }
      } catch (error) {
        console.log('Could not fetch summary from server:', error.message)
      }
    }
    
    console.log('API: Loading retrospective data...')
    const data = loadRetrospectiveData()
    
    if (!data || Object.keys(data).length === 0) {
      console.log('API: No data loaded from Excel files, returning fallback data')
      // Return fallback data instead of error
      return NextResponse.json({
        totalResponses: 0,
        totalQuestions: 0,
        averageResponseRate: 0,
        summary: {},
        questionCounts: {},
        months: [],
        message: 'No Excel data found, but API is working'
      })
    }
    
    console.log('API: Data loaded successfully, processing summary...')
    console.log('API: Found months:', Object.keys(data))
    
    // Calculate summary statistics
    const summary = {}
    const monthlyResponses = {}
    const questionCounts = {}
    
    // Get all months and sort them
    const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
    
    for (const month of allMonths) {
      const monthData = data[month]
      if (monthData && monthData.length > 0) {
        // Count total responses for this month
        monthlyResponses[month] = monthData.length
        
        // Count questions (columns) for this month
        if (monthData.length > 0) {
          questionCounts[month] = Object.keys(monthData[0]).length
        }
        
        // Calculate summary for each question
        const firstRow = monthData[0]
        if (firstRow) {
          for (const question of Object.keys(firstRow)) {
            if (!summary[question]) {
              summary[question] = {}
            }
            
            // Count responses for each answer option
            const answerCounts = {}
            monthData.forEach(row => {
              const answer = row[question]
              if (answer !== undefined && answer !== null && answer !== '') {
                answerCounts[answer] = (answerCounts[answer] || 0) + 1
              }
            })
            
            summary[question][month] = answerCounts
          }
        }
      }
    }
    
    // Calculate totals for the summary
    const totalResponses = Object.values(monthlyResponses).reduce((sum, count) => sum + count, 0)
    const totalQuestions = Object.values(questionCounts).reduce((sum, count) => sum + count, 0)
    const averageResponseRate = allMonths.length > 0 ? totalResponses / allMonths.length : 0
    
    const result = {
      totalResponses,
      totalQuestions,
      averageResponseRate,
      summary,
      questionCounts,
      months: allMonths
    }
    
    console.log('API: Summary processed successfully')
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 