import { NextResponse } from 'next/server'
import { loadRetrospectiveData, getCachedData, setCachedData } from '../../../api/cache.js'

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
