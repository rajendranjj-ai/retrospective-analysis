import { NextResponse } from 'next/server';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Load retrospective data from the current directory
function loadRetrospectiveData() {
  console.log('Starting to load retrospective data...')
  const data = {}
  
  // Check both current directory and Retrospectives subfolder
  const directories = ['.', './Retrospectives']
  
  for (const dir of directories) {
    try {
      console.log(`Checking directory: ${dir}`)
      const files = fs.readdirSync(path.join(process.cwd(), dir))
      console.log(`Files in ${dir}:`, files)
      
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Retrospective') &&
        !file.includes('~$') // Exclude temporary Excel files
      )
      console.log(`Excel files found in ${dir}:`, excelFiles)
      
      for (const file of excelFiles) {
        try {
          console.log(`Processing file: ${file}`)
          const month = file.split(' ')[0]
          const filePath = path.join(process.cwd(), dir, file)
          console.log(`File path: ${filePath}`)
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
          
          // If month already exists, append data (in case of duplicates)
          if (data[month]) {
            console.log(`Appending data to existing ${month}: ${jsonData.length} additional responses`)
            data[month] = [...data[month], ...jsonData]
          } else {
            data[month] = jsonData
          }
          console.log(`Loaded ${month}: ${jsonData.length} responses from ${file}`)
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

export async function GET() {
  try {
    console.log('API: Loading retrospective data...')
    const data = loadRetrospectiveData()
    
    if (!data || Object.keys(data).length === 0) {
      console.log('API: No data loaded')
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }
    
    console.log('API: Data loaded successfully, processing summary...')
    
    // Calculate summary statistics
    const summary = {}
    const totalResponses = {}
    const questionCounts = {}
    
    // Get all months and sort them
    const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
    
    for (const month of allMonths) {
      const monthData = data[month]
      if (monthData && monthData.length > 0) {
        // Count total responses for this month
        totalResponses[month] = monthData.length
        
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
    
    const result = {
      summary,
      totalResponses,
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