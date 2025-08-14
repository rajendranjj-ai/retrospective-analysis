import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import PptxGenJS from 'pptxgenjs';

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

export async function POST(request) {
  try {
    const data = loadRetrospectiveData()
    
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }
    
    // Get all unique questions
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
    
    // Create PowerPoint
    const pptx = new PptxGenJS()
    
    // Get all months and sort them
    const allMonths = Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b))
    
    let slideCount = 0
    
    // Process each question
    for (const question of questions) {
      try {
        console.log(`Processing question ${slideCount + 1}: ${question.substring(0, 50)}...`)
        
        // Slide 1: Question and Trend Analysis
        const slide1 = pptx.addSlide()
        slide1.addText(`Question ${slideCount + 1}: ${question}`, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 20,
          bold: true,
          align: 'center'
        })
        
        // Add trend data as text (since charts are disabled for stability)
        const { trends, responseCounts } = analyzeQuestionTrends(data, question)
        let trendText = 'Trend Analysis:\n\n'
        
        for (const month of allMonths) {
          if (trends[month] && Object.keys(trends[month]).length > 0) {
            trendText += `${month}:\n`
            for (const [answer, count] of Object.entries(trends[month])) {
              trendText += `  ${answer}: ${count}\n`
            }
            trendText += '\n'
          }
        }
        
        slide1.addText(trendText, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 5,
          fontSize: 10
        })
        
        // Slide 2: Director Analysis
        const slide2 = pptx.addSlide()
        slide2.addText(`Director Analysis: ${question.substring(0, 50)}`, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 20,
          bold: true,
          align: 'center'
        })
        
        const directorAnalysis = analyzeDirectorData(data, question)
        let directorText = 'Director Analysis (Last 3 Releases):\n\n'
        
        for (const month of Object.keys(directorAnalysis)) {
          directorText += `${month}:\n`
          const monthData = directorAnalysis[month]
          
          if (monthData && monthData.directors) {
            for (const director of monthData.directors) {
              directorText += `  ${director}:\n`
              if (monthData.data[director]) {
                for (const [answer, data] of Object.entries(monthData.data[director])) {
                  directorText += `    ${answer}: ${data.percentage}% (${data.count})\n`
                }
              }
              directorText += '\n'
            }
          }
          directorText += '\n'
        }
        
        slide2.addText(directorText, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 5,
          fontSize: 8
        })
        
        slideCount += 2
        console.log(`Created ${slideCount} slides for question: ${question.substring(0, 50)}`)
        
      } catch (error) {
        console.error(`Error processing question "${question}":`, error.message)
        // Continue with next question
      }
    }
    
    console.log(`Export completed. Generated ${questions.length} questions with ${slideCount} slides total`)
    
    // Generate PowerPoint buffer
    const buffer = await pptx.write('buffer')
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': 'attachment; filename="retrospective-analysis-all-questions.pptx"'
      }
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 