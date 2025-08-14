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
  
  // Enhanced directory resolution for Vercel and local environments
  let directories = []
  
  if (process.env.VERCEL) {
    // Vercel environment - try multiple possible locations
    directories = [
      './Retrospectives',
      './public/Retrospectives', 
      'Retrospectives',
      'public/Retrospectives'
    ]
    console.log('🔍 Vercel environment detected - trying multiple file locations for questions extraction')
  } else {
    // Local development
    directories = ['.', './Retrospectives']
    console.log('🔍 Local environment detected for questions extraction')
  }
  
  console.log('Project root:', projectRoot)
  console.log('Directories to check:', directories)
  
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
        file.includes('Release Retrospective') && 
        !file.includes('~$') // Exclude temporary Excel files
      )
      
      console.log(`📁 Found ${excelFiles.length} Excel files in ${dir}:`, excelFiles)
      
      if (excelFiles.length === 0) {
        console.log(`No Excel files found in ${dir}, continuing to next directory...`)
        continue
      }
      
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
          
          if (!fs.existsSync(filePath)) {
            console.log(`File ${filePath} does not exist, skipping...`)
            continue
          }
          
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
          console.error(`❌ Error processing file ${file}:`, fileError.message)
          if (process.env.VERCEL) {
            console.log(`Vercel file access error for ${file} - this may be expected in serverless environment`)
          }
        }
      }
      
      // If we found files in this directory, break (prioritize first working directory)
      if (allQuestions.length > 0) {
        console.log(`✅ Successfully extracted questions from ${dir}, using this directory`)
        break
      }
      
    } catch (error) {
      console.error(`❌ Error reading directory ${dir}:`, error.message)
      if (process.env.VERCEL) {
        console.log(`Vercel directory access error for ${dir} - trying next location`)
      }
    }
  }
  
  // Create basic sections for Vercel environment (when we don't have the curated file)
  const sections = createBasicSections(allQuestions)
  
  return {
    allQuestions: allQuestions, // Already an array in encounter order
    sections: sections,
    questionsByRelease,
    totalUniqueQuestions: allQuestions.length
  }
}

// Helper function to create basic sections from questions when we don't have the curated file
function createBasicSections(questions) {
  const sections = {
    'Release Questionnaire': [],
    'Sprint Retrospective': [],
    'Release Review': [],
    'Cursor adoption': [],
    'AI Efficiency': [],
    'others': []
  }
  
  // Categorize questions based on keywords
  questions.forEach(question => {
    const lowerQuestion = question.toLowerCase()
    
    if (lowerQuestion.includes('ai') || lowerQuestion.includes('artificial intelligence') || lowerQuestion.includes('productivity')) {
      sections['AI Efficiency'].push(question)
    } else if (lowerQuestion.includes('cursor') || lowerQuestion.includes('copilot') || lowerQuestion.includes('ide')) {
      sections['Cursor adoption'].push(question)
    } else if (lowerQuestion.includes('sprint retrospective') || lowerQuestion.includes('action item')) {
      sections['Sprint Retrospective'].push(question)
    } else if (lowerQuestion.includes('release overall') || lowerQuestion.includes('release planning') || lowerQuestion.includes('directly involved')) {
      sections['Release Questionnaire'].push(question)
    } else if (lowerQuestion.includes('release') || lowerQuestion.includes('deliverable') || lowerQuestion.includes('timeline')) {
      sections['Release Review'].push(question)
    } else {
      sections['others'].push(question)
    }
  })
  
  // Remove empty sections
  Object.keys(sections).forEach(key => {
    if (sections[key].length === 0) {
      delete sections[key]
    }
  })
  
  return sections
}

export async function GET() {
  try {
    console.log('🔍 ALL QUESTIONS API: Reading questions from all_unique_questions.txt...')
    
    const startTime = Date.now()
    
    // First, try to read from the predefined all_unique_questions.txt file
    let questionsFilePath
    
    if (process.env.VERCEL) {
      // In Vercel, try public directory first
      questionsFilePath = path.join(process.cwd(), 'public', 'all_unique_questions.txt')
    } else {
      // Local development
      questionsFilePath = path.join(process.cwd(), 'all_unique_questions.txt')
    }
    
    // Also try backup location for Vercel
    const backupFilePath = process.env.VERCEL ? path.join(process.cwd(), 'all_unique_questions.txt') : null
    
    if (fs.existsSync(questionsFilePath) || (backupFilePath && fs.existsSync(backupFilePath))) {
      const fileToRead = fs.existsSync(questionsFilePath) ? questionsFilePath : backupFilePath
      
      console.log(`📖 Reading questions from ${fileToRead}...`)
      try {
        const fileContent = fs.readFileSync(fileToRead, 'utf8')
          const sections = {}
          let currentSection = 'General'
          
          const lines = fileContent.split('\n').map(line => line.trim())
          
          for (const line of lines) {
            if (line.startsWith('Section Name:') || line.startsWith('Section:')) {
              currentSection = line.replace('Section Name:', '').replace('Section:', '').trim()
              sections[currentSection] = []
            } else if (line.length > 0) {
              if (!sections[currentSection]) {
                sections[currentSection] = []
              }
              sections[currentSection].push(line)
            }
          }
          
          // Collect all questions in order
          const allQuestions = []
          for (const sectionQuestions of Object.values(sections)) {
            allQuestions.push(...sectionQuestions)
          }
          
          const loadTime = Date.now() - startTime
          
          console.log(`📊 Questions loaded from file: ${allQuestions.length} questions across ${Object.keys(sections).length} sections in ${loadTime}ms`)
          console.log(`📋 Sections found: ${Object.keys(sections).join(', ')}`)
          
          return NextResponse.json({
            success: true,
            questions: allQuestions,
            sections: sections,
            metadata: {
              totalUniqueQuestions: allQuestions.length,
              sectionNames: Object.keys(sections),
              sectionCount: Object.keys(sections).length,
              source: 'all_unique_questions.txt',
              loadTime: loadTime,
              extractedAt: new Date().toISOString()
            }
          })
      } catch (fileError) {
        console.log('⚠️ Error reading all_unique_questions.txt:', fileError.message)
      }
    } else {
      console.log('🔍 No questions file found - extracting from Excel directly')
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
    
    console.log(`📋 Sections created: ${Object.keys(result.sections).join(', ')}`)
    
    return NextResponse.json({
      success: true,
      questions: result.allQuestions,
      sections: result.sections,
      metadata: {
        totalUniqueQuestions: result.totalUniqueQuestions,
        sectionNames: Object.keys(result.sections),
        sectionCount: Object.keys(result.sections).length,
        releaseCount: Object.keys(result.questionsByRelease).length,
        questionsByRelease: result.questionsByRelease,
        loadTime: loadTime,
        source: process.env.VERCEL ? 'Excel files (Vercel)' : 'Excel files (local)',
        vercelEnvironment: !!process.env.VERCEL,
        extractedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Error extracting questions:', error)
    return NextResponse.json({ 
      error: error.message,
      success: false,
      vercelEnvironment: !!process.env.VERCEL
    }, { status: 500 })
  }
}