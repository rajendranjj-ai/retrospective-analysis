import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

// Helper function to extract month and year order for sorting
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

function loadAllQuestions() {
  const allQuestions = [] // Use array to preserve order
  const seenQuestions = new Set() // Use set to track uniqueness
  const questionsByRelease = {}
  
  const projectRoot = process.cwd()
  const directories = ['.', 'Retrospectives'] // Use relative paths like other working endpoints
  
  // Debug path information
  const retroPath = path.join(projectRoot, 'Retrospectives')
  console.log('Project root:', projectRoot)
  console.log('Retrospectives path:', retroPath)
  console.log('Retrospectives exists:', fs.existsSync(retroPath))
  
  for (const dir of directories) {
    try {
      const fullPath = path.join(projectRoot, dir)
      console.log(`Checking directory: ${fullPath}`)
      
      if (!fs.existsSync(fullPath)) {
        console.log(`Directory ${fullPath} does not exist, skipping...`)
        continue
      }
      
      const files = fs.readdirSync(fullPath)
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Retrospective') && 
        !file.includes('~$') // Exclude temporary Excel files
      )
      
      console.log(`📁 Found ${excelFiles.length} Excel files in ${dir}:`, excelFiles)
      
      // Sort files chronologically
      const sortedFiles = excelFiles.sort((a, b) => {
        const extractFileOrder = (filename) => {
          const monthYearMatch = filename.match(/(\w+)\s+(\d{4})\s+Release/)
          if (monthYearMatch) {
            const [, month, year] = monthYearMatch
            return extractMonthOrder(`${month} ${year}`)
          }
          return 999999 // Put unmatched files at the end
        }
        return extractFileOrder(a) - extractFileOrder(b)
      })
      
              for (const file of sortedFiles) {
          try {
            const filePath = path.join(fullPath, file)
          console.log(`📄 Processing file: ${file}`)
          
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Get the range and convert to JSON
          const range = XLSX.utils.decode_range(worksheet['!ref'])
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length > 0) {
            const headers = jsonData[0] // First row contains headers
            
            console.log(`📊 File ${file} has ${headers.length} columns, ${jsonData.length} rows`)
            
            // Extract month/year from filename
            const monthYearMatch = file.match(/(\w+)\s+(\d{4})\s+Release/)
            const releaseKey = monthYearMatch ? `${monthYearMatch[1]} ${monthYearMatch[2]}` : file
            
            // Store questions for this release
            const releaseQuestions = []
            
            // Add all column headers as questions (excluding 'Timestamp')
            headers.forEach((header, index) => {
              if (header && header.trim() && header !== 'Timestamp') {
                const cleanHeader = header.trim()
                // Add to array only if not seen before (maintains order)
                if (!seenQuestions.has(cleanHeader)) {
                  allQuestions.push(cleanHeader)
                  seenQuestions.add(cleanHeader)
                }
                releaseQuestions.push(cleanHeader)
              }
            })
            
            questionsByRelease[releaseKey] = {
              file: file,
              questionCount: releaseQuestions.length,
              questions: releaseQuestions
            }
            
            console.log(`✅ Extracted ${releaseQuestions.length} questions from ${releaseKey}`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file}:`, fileError.message)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message)
    }
  }
  
  return {
    allQuestions: allQuestions, // Already an array in encounter order
    questionsByRelease,
    totalUniqueQuestions: allQuestions.length
  }
}

export async function GET() {
  try {
    console.log('🔍 ALL QUESTIONS API: Reading questions from all_unique_questions.txt...')
    
    const startTime = Date.now()
    
    // First, try to read from the predefined all_unique_questions.txt file
    const questionsFilePath = path.join(process.cwd(), 'all_unique_questions.txt')
    
    if (fs.existsSync(questionsFilePath)) {
      console.log('📖 Reading questions from all_unique_questions.txt file...')
      const fileContent = fs.readFileSync(questionsFilePath, 'utf8')
      const questionsFromFile = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      const loadTime = Date.now() - startTime
      
      console.log(`📊 Questions loaded from file: ${questionsFromFile.length} questions in ${loadTime}ms`)
      
      return NextResponse.json({
        success: true,
        questions: questionsFromFile,
        metadata: {
          totalUniqueQuestions: questionsFromFile.length,
          source: 'all_unique_questions.txt',
          loadTime: loadTime,
          extractedAt: new Date().toISOString()
        }
      })
    }
    
    // Fallback: Extract from Excel files if txt file doesn't exist
    console.log('📊 Fallback: Extracting unique questions from Excel files...')
    const result = loadAllQuestions()
    const loadTime = Date.now() - startTime
    
    console.log(`📊 Extraction complete: ${result.totalUniqueQuestions} unique questions found in ${loadTime}ms`)
    console.log(`📋 Questions found across ${Object.keys(result.questionsByRelease).length} releases`)
    
    // Log some sample questions for verification
    if (result.allQuestions.length > 0) {
      console.log(`📝 Sample questions:`)
      result.allQuestions.slice(0, 5).forEach((q, i) => {
        console.log(`   ${i + 1}. ${q.substring(0, 100)}${q.length > 100 ? '...' : ''}`)
      })
    }
    
    return NextResponse.json({
      success: true,
      questions: result.allQuestions,
      metadata: {
        totalUniqueQuestions: result.totalUniqueQuestions,
        releaseCount: Object.keys(result.questionsByRelease).length,
        questionsByRelease: result.questionsByRelease,
        loadTime: loadTime,
        source: 'Excel files',
        extractedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Error extracting questions:', error)
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 })
  }
}