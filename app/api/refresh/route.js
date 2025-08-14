import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { clearGlobalCache, setCachedData, getCacheStats } from '../cache.js';

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

function loadRetrospectiveData() {
  const data = {}
  console.log('Starting to load retrospective data...')
  console.log('Current working directory:', process.cwd())
  console.log('Environment - NODE_ENV:', process.env.NODE_ENV)
  console.log('Environment - VERCEL:', process.env.VERCEL ? 'YES' : 'NO')

  // Enhanced path resolution for different environments
  let projectRoot = process.cwd()
  let directories = []
  
  if (process.env.VERCEL) {
    // Vercel environment - try multiple possible locations
    directories = [
      './Retrospectives',
      './public/Retrospectives', 
      'Retrospectives',
      'public/Retrospectives'
    ]
    console.log('🔍 Vercel environment detected - trying multiple file locations')
  } else {
    // Local development
    directories = ['.', './Retrospectives']
    console.log('🔍 Local environment detected')
  }
  
  console.log('Project root:', projectRoot)
  console.log('Directories to check:', directories)

  for (const dir of directories) {
    try {
      const fullPath = path.join(projectRoot, dir)
      console.log(`Checking directory: ${fullPath}`)
      
      // Check if directory exists
      if (!fs.existsSync(fullPath)) {
        console.log(`Directory ${fullPath} does not exist, skipping...`)
        continue
      }
      
      const files = fs.readdirSync(fullPath)
      console.log(`Files in ${dir}:`, files.length > 0 ? files.slice(0, 5) : 'No files found')
      
      const excelFiles = files.filter(file => 
        file.endsWith('.xlsx') && 
        file.includes('Release Retrospective') &&
        !file.includes('~$') // Exclude temporary Excel files
      )
      console.log(`Excel files found in ${dir}:`, excelFiles)
      
      if (excelFiles.length === 0) {
        console.log(`No Excel files found in ${dir}, continuing to next directory...`)
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
      console.log(`Sorted files in ${dir}:`, sortedFiles)
      
      for (const file of sortedFiles) {
        const filePath = path.join(fullPath, file)
        console.log(`Processing file: ${file}`)
        console.log(`File path: ${filePath}`)
        
        try {
          // Check file exists and is readable
          if (!fs.existsSync(filePath)) {
            console.log(`File ${filePath} does not exist, skipping...`)
            continue
          }
          
          const workbook = XLSX.readFile(filePath)
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          // Extract month and year to handle multiple files for same month
          const parts = file.split(' ')
          const month = parts[0]
          const year = parts[1]
          const monthKey = year ? `${month} ${year}` : month
          data[monthKey] = jsonData
          console.log(`✅ Loaded ${monthKey}: ${jsonData.length} responses from ${file}`)
          
        } catch (error) {
          console.log(`❌ Error loading ${file}:`, error.message)
          if (process.env.VERCEL) {
            console.log(`Vercel file access error - this may be expected in serverless environment`)
          }
        }
      }
      
      // If we found files in this directory, we can break (prioritize first working directory)
      if (Object.keys(data).length > 0) {
        console.log(`✅ Successfully loaded data from ${dir}, using this directory`)
        break
      }
      
    } catch (error) {
      console.log(`❌ Directory ${dir} error:`, error.message)
      if (process.env.VERCEL) {
        console.log(`Vercel directory access error - trying next location`)
      }
    }
  }

  console.log(`📊 Final data loading result: ${Object.keys(data).length} releases loaded`)
  return data
}

export async function POST() {
  try {
    console.log('🔄 REFRESH DATA API CALLED - Performing complete data refresh...')
    console.log('📍 Environment:', process.env.NODE_ENV || 'production')
    console.log('📍 Vercel:', process.env.VERCEL ? 'YES' : 'NO')
    
    // Step 1: Clear ALL cached data first
    console.log('🗑️ Clearing all stored metrics and cached data...')
    clearGlobalCache()
    
    // Step 2: For development, try Node.js server first
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔄 Attempting to refresh Node.js server data...')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const serverResponse = await fetch('http://localhost:4005/api/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (serverResponse.ok) {
          const serverData = await serverResponse.json()
          console.log('✅ Successfully refreshed Node.js server data')
          
          const summary = {
            ...serverData.summary,
            cacheCleared: true,
            serverRefreshed: true,
            source: 'nodejs-server'
          }
          
          console.log(`✅ COMPLETE DATA REFRESH SUCCESSFUL (via Node.js server)`)
          console.log(`📊 Final results: ${summary.filesLoaded} files, ${summary.totalResponses} total responses`)
          
          return NextResponse.json({
            success: true,
            message: 'All stored metrics cleared and data refreshed successfully',
            summary: summary
          })
        }
      } catch (error) {
        console.log('⚠️ Could not refresh server data, proceeding with Next.js only refresh:', error.message)
      }
    }

    // Step 3: Load fresh data directly for Vercel/production
    console.log('🔄 Loading fresh data directly...')
    const startTime = Date.now()
    
    // Enhanced error handling for Vercel
    let data
    try {
      data = loadRetrospectiveData()
    } catch (fileError) {
      console.error('❌ File loading error:', fileError.message)
      
      // For Vercel, provide specific guidance
      if (process.env.VERCEL) {
        return NextResponse.json({
          error: 'File access failed in Vercel environment',
          details: 'Excel files may not be accessible in serverless environment',
          suggestion: 'Ensure files are in public directory or use external storage',
          cacheCleared: true,
          vercelEnvironment: true
        }, { status: 500 })
      }
      
      throw fileError
    }
    
    const loadTime = Date.now() - startTime
    
    console.log(`📁 File scan results: Found ${Object.keys(data).length} release files`)
    if (Object.keys(data).length > 0) {
      console.log(`📋 Release files detected: ${Object.keys(data).join(', ')}`)
    }
    
    if (Object.keys(data).length === 0) {
      console.log('⚠️ No files found - check Retrospectives folder')
      
      // Enhanced error response for Vercel
      const errorResponse = {
        error: 'No retrospective files found after refresh',
        loadTime: loadTime,
        cacheCleared: true,
        vercelEnvironment: !!process.env.VERCEL,
        suggestion: process.env.VERCEL 
          ? 'In Vercel, ensure Excel files are in the deployment or use external storage'
          : 'Check the Retrospectives folder exists and contains Excel files'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Step 4: Update cache with fresh data
    console.log('💾 Updating cache with fresh data...')
    setCachedData(data)
    
    // Step 5: Prepare summary
    const summary = {
      filesLoaded: Object.keys(data).length,
      totalResponses: Object.values(data).reduce((sum, monthData) => sum + monthData.length, 0),
      loadTime: loadTime,
      releases: Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b)),
      refreshedAt: new Date().toISOString(),
      cacheCleared: true,
      serverRefreshed: false,
      source: process.env.VERCEL ? 'vercel-serverless' : 'nextjs-direct',
      vercelEnvironment: !!process.env.VERCEL,
      cacheStats: getCacheStats()
    }
    
    console.log(`✅ COMPLETE DATA REFRESH SUCCESSFUL`)
    console.log(`📊 Final results: ${summary.filesLoaded} files, ${summary.totalResponses} total responses`)
    console.log(`🔄 Cache cleared: YES | Environment: ${summary.source}`)
    
    return NextResponse.json({
      success: true,
      message: 'All stored metrics cleared and data refreshed successfully',
      summary: summary
    })
    
  } catch (error) {
    console.error('❌ Error refreshing data:', error)
    clearGlobalCache()
    
    // Enhanced error response with Vercel-specific guidance
    const errorResponse = {
      error: 'Failed to refresh data',
      details: error.message,
      cacheCleared: true,
      vercelEnvironment: !!process.env.VERCEL
    }
    
    if (process.env.VERCEL) {
      errorResponse.vercelGuidance = 'Vercel serverless functions have file system limitations. Consider using external storage or database for Excel files.'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}