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

export async function GET() {
  try {
    const data = loadRetrospectiveData()
    
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