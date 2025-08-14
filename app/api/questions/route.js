import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { getCachedData, setCachedData } from '../cache.js';

// Load retrospective data from the current directory
function loadRetrospectiveData() {
  const data = {}
  
  // Check both current directory and Retrospectives subfolder
  const directories = ['.', './Retrospectives']
  
  console.log('Current working directory:', process.cwd())
  console.log('__dirname:', __dirname)
  
  // Use different path resolution based on environment
  let projectRoot
  if (process.env.VERCEL) {
    // On Vercel, files are in the function's working directory
    projectRoot = process.cwd()
  } else {
    // Local development
    projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..')
  }
  console.log('Project root:', projectRoot)
  
  // Test if we can access the Retrospectives directory directly
  const retroPath = path.join(projectRoot, 'Retrospectives')
  console.log('Retrospectives path:', retroPath)
  console.log('Retrospectives exists:', fs.existsSync(retroPath))
  
  // Try to list files in Retrospectives directly
  try {
    const retroFiles = fs.readdirSync(retroPath)
    console.log('Files in Retrospectives:', retroFiles)
  } catch (error) {
    console.log('Error reading Retrospectives:', error.message)
  }
  
  for (const dir of directories) {
    try {
      const fullPath = path.join(projectRoot, dir)
      console.log(`Checking directory: ${fullPath}`)
      const files = fs.readdirSync(fullPath)
      
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Retrospective') &&
        !file.includes('~$') // Exclude temporary Excel files
      )
      
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
          // Extract month and year to handle multiple files for same month
          const parts = file.split(' ')
          const month = parts[0]
          const year = parts[1]
          const monthKey = year ? `${month} ${year}` : month
          const filePath = path.join(process.cwd(), '..', dir, file)
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
          
          // If monthKey already exists, append data (in case of duplicates)
          if (data[monthKey]) {
            data[monthKey] = [...data[monthKey], ...jsonData]
          } else {
            data[monthKey] = jsonData
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

export async function GET() {
  try {
    // Step 1: Check cache first
    let data = getCachedData()
    
    if (!data) {
      // Step 2: Try server first only in development
      if (process.env.NODE_ENV === 'development') {
        try {
          const serverResponse = await fetch('http://localhost:4005/api/questions')
          if (serverResponse.ok) {
            const serverData = await serverResponse.json()
            console.log('Successfully got data from server')
            return NextResponse.json(serverData)
          }
        } catch (error) {
          console.log('Could not fetch from server:', error.message)
        }
      }
      
      // Step 3: Load data directly if not cached
      console.log('📋 Loading questions data directly (not cached)...')
      data = loadRetrospectiveData()
      
      if (Object.keys(data).length > 0) {
        setCachedData(data)
      }
    } else {
      console.log('📋 Using cached questions data')
    }
    
    if (!data || Object.keys(data).length === 0) {
      console.log('Questions API: No data loaded, returning fallback data')
      return NextResponse.json({ 
        categories: { 'No Data': [] },
        orderedQuestions: [],
        message: 'No Excel data found, but API is working'
      })
    }
    
    // Get all unique questions from all months
    const allQuestions = new Set()
    
    for (const month of Object.keys(data)) {
      const monthData = data[month]
      if (monthData && monthData.length > 0) {
        const firstRow = monthData[0]
        if (firstRow) {
          Object.keys(firstRow).forEach(question => allQuestions.add(question))
        }
      }
    }
    
    // Convert to array and sort
    const questions = Array.from(allQuestions).sort()
    
    // Add numbering to questions
    const numberedQuestions = questions.map((question, index) => ({
      id: index + 1,
      text: question
    }))
    
    // Return in the format expected by the frontend
    return NextResponse.json({ 
      categories: { 'All Questions': questions },
      orderedQuestions: questions
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 