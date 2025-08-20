import { NextResponse } from 'next/server'
import { getCachedData, setCachedData } from '../../../api/cache.js'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

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
          const filePath = path.join(process.cwd(), dir, file)
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Get the range of the worksheet
          const range = XLSX.utils.decode_range(worksheet['!ref'])
          console.log(`File ${file} has range: ${worksheet['!ref']} (${range.e.c + 1} columns, ${range.e.r + 1} rows)`)
          
          // Convert to JSON and get headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          if (jsonData.length > 0) {
            // Normalize headers by removing line breaks and trimming
            const normalizedData = jsonData.map(row => {
              const normalizedRow = {}
              for (const [key, value] of Object.entries(row)) {
                // Normalize header: remove \r\n and trim whitespace
                const normalizedKey = key.replace(/\r\n/g, ' ').trim()
                normalizedRow[normalizedKey] = value
              }
              return normalizedRow
            })
            
            // Store data for this month (overwrite if duplicate)
            data[monthKey] = normalizedData
            console.log(`Loaded ${monthKey}: ${normalizedData.length} responses from ${file}`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file}:`, fileError)
        }
      }
    } catch (dirError) {
      if (dirError.code !== 'ENOENT') {
        console.error(`Error reading directory ${dir}:`, dirError)
      }
    }
  }
  
  return data
}

export async function GET(request, { params }) {
  try {
    const { month } = params
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 })
    }

    // Decode the month parameter (in case it has spaces)
    const decodedMonth = decodeURIComponent(month)

    // Step 1: Check cache first  
    let data = getCachedData()
    
    if (!data) {
      // Step 2: Try server first only in development
      if (process.env.NODE_ENV === 'development') {
        try {
          const serverResponse = await fetch(`http://localhost:4005/api/director-counts/${encodeURIComponent(decodedMonth)}`)
          if (serverResponse.ok) {
            const serverData = await serverResponse.json()
            console.log('Successfully got director counts from server')
            return NextResponse.json(serverData)
          }
        } catch (error) {
          console.log('Could not fetch director counts from server:', error.message)
        }
      }
      
      // Step 3: Load data directly if not cached
      console.log('📋 Loading director counts data directly (not cached)...')
      data = loadRetrospectiveData()
      
      if (Object.keys(data).length > 0) {
        setCachedData(data)
      }
    }
    
    if (!data || Object.keys(data).length === 0) {
      console.log('Director counts API: No data loaded')
      return NextResponse.json({ error: 'No data available' }, { status: 404 })
    }

    // Check if the month exists in our data
    const monthData = data[decodedMonth]
    if (!monthData || monthData.length === 0) {
      return NextResponse.json({ 
        month: decodedMonth,
        directors: [],
        message: 'No data found for this month'
      })
    }

    // Get director question - look for the standard director question
    const directorQuestions = [
      'You are part of which of the following directors org',
      'Select reporting manager per Sage?'
    ]

    let directorColumn = null
    const firstRow = monthData[0] || {}
    
    // Find the director column
    for (const question of directorQuestions) {
      if (firstRow.hasOwnProperty(question)) {
        directorColumn = question
        break
      }
    }

    if (!directorColumn) {
      return NextResponse.json({
        month: decodedMonth,
        directors: [],
        message: 'No director information found for this month'
      })
    }

    // Count responses by director
    const directorCounts = {}
    
    monthData.forEach(row => {
      const director = row[directorColumn]
      if (director && director.trim() !== '') {
        const cleanDirector = director.trim()
        directorCounts[cleanDirector] = (directorCounts[cleanDirector] || 0) + 1
      }
    })

    // Add total counts and participation rates for specific months
    const directorTotals = {
      'August 2025': {
        'Diksha Khatri': 28,
        'Jegadeesh Santhana Krishnan': 93,
        'Krishna Kishore Mothukuri': 14,
        'Mohammed Fayaz': 65,
        'Mujtaba Ahmad': 50
      },
      'July 2025': {
        'Diksha Khatri': 17,
        'Jegadeesh Santhana Krishnan': 84,
        'Krishna Kishore Mothukuri': 15,
        'Mohammed Fayaz': 60,
        'Mujtaba Ahmad': 43
      },
      'May 2025': {
        'Diksha Khatri': 17,
        'Jegadeesh Santhana Krishnan': 87,
        'Krishna Kishore Mothukuri': 10,
        'Mohammed Fayaz': 63,
        'Mujtaba Ahmad': 42
      }
    }

    // Convert to array and sort by count (descending)
    const directorArray = Object.entries(directorCounts)
      .map(([director, count]) => {
        const item = { director, count }
        
        // Add total count and participation rate for specific months
        if (directorTotals[decodedMonth] && directorTotals[decodedMonth][director]) {
          item.totalCount = directorTotals[decodedMonth][director]
          item.participationRate = (count / item.totalCount) * 100
        }
        
        return item
      })
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      month: decodedMonth,
      directors: directorArray,
      total: directorArray.reduce((sum, item) => sum + item.count, 0)
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
