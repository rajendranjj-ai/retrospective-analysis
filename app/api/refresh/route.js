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
  const directories = ['.', './Retrospectives']

  console.log('Starting to load retrospective data...')
  console.log('Current working directory:', process.cwd())
  console.log('__dirname:', __dirname)

  // Use different path resolution based on environment
  let projectRoot
  if (process.env.VERCEL) {
    // On Vercel, files are in the function's working directory
    projectRoot = process.cwd()
  } else {
    // Local development - use process.cwd() which points to project root
    projectRoot = process.cwd()
  }
  console.log('Project root:', projectRoot)

  for (const dir of directories) {
    try {
      const fullPath = path.join(projectRoot, dir)
      console.log(`Checking directory: ${fullPath}`)
      const files = fs.readdirSync(fullPath)
      console.log(`Files in ${dir}:`, files)
      
      const excelFiles = files.filter(file => file.endsWith('.xlsx') && file.includes('Release Retrospective'))
      console.log(`Excel files found in ${dir}:`, excelFiles)
      
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
          console.log(`Loaded ${monthKey}: ${jsonData.length} responses from ${file}`)
          
        } catch (error) {
          console.log(`Error loading ${file}:`, error.message)
        }
      }
    } catch (error) {
      console.log(`Directory ${dir} not accessible, skipping...`)
    }
  }

  return data
}

export async function POST() {
  try {
    console.log('🔄 REFRESH DATA API CALLED - Performing complete data refresh...')
    console.log('📍 Environment:', process.env.NODE_ENV || 'production')
    
    // Step 1: Clear ALL cached data first
    console.log('🗑️ Clearing all stored metrics and cached data...')
    clearGlobalCache()
    
    // Step 2: Re-check files in retrospectives folder
    console.log('📁 Re-scanning Retrospectives folder for files...')
    
    // Step 3: Try to refresh Node.js server data first (for development)
    let serverRefreshed = false
    let serverSummary = null
    
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔄 Attempting to refresh Node.js server data...')
        const serverResponse = await fetch('http://localhost:4005/api/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        })
        
        if (serverResponse.ok) {
          const serverData = await serverResponse.json()
          console.log('✅ Successfully refreshed Node.js server data')
          serverRefreshed = true
          serverSummary = serverData.summary
          
          // In development, prefer server data and return success immediately
          console.log(`📊 Server loaded: ${serverSummary.filesLoaded} files, ${serverSummary.totalResponses} responses`)
          
          // Return successful refresh based on Node.js server data
          const summary = {
            ...serverSummary,
            cacheCleared: true,
            serverRefreshed: true,
            source: 'nodejs-server'
          }
          
          console.log(`✅ COMPLETE DATA REFRESH SUCCESSFUL (via Node.js server)`)
          console.log(`📊 Final results: ${summary.filesLoaded} files, ${summary.totalResponses} total responses`)
          console.log(`🔄 Cache cleared: YES | Server refreshed: YES`)
          
          return NextResponse.json({
            success: true,
            message: 'All stored metrics cleared and data refreshed successfully',
            summary: summary
          })
        } else {
          console.log(`⚠️ Server response not OK: ${serverResponse.status}`)
        }
      } catch (error) {
        console.log('⚠️ Could not refresh server data, proceeding with Next.js only refresh:', error.message)
      }
    }

    // Step 4: Load fresh data directly and update Next.js cache
    console.log('🔄 Loading fresh data directly for Next.js cache...')
    const startTime = Date.now()
    const data = loadRetrospectiveData()
    const loadTime = Date.now() - startTime
    
    console.log(`📁 File scan results: Found ${Object.keys(data).length} release files`)
    if (Object.keys(data).length > 0) {
      console.log(`📋 Release files detected: ${Object.keys(data).join(', ')}`)
    }
    
    if (Object.keys(data).length === 0) {
      console.log('⚠️ No files found - check Retrospectives folder')
      return NextResponse.json({ 
        error: 'No retrospective files found after refresh - please check the Retrospectives folder',
        loadTime: loadTime,
        cacheCleared: true,
        serverRefreshed: serverRefreshed,
        folderChecked: true
      }, { status: 404 })
    }
    
    // Step 5: Update Next.js cache with fresh data
    console.log('💾 Updating Next.js cache with fresh data...')
    setCachedData(data)
    
    // Step 6: Prepare comprehensive summary
    const nextJsSummary = {
      filesLoaded: Object.keys(data).length,
      totalResponses: Object.values(data).reduce((sum, monthData) => sum + monthData.length, 0),
      loadTime: loadTime,
      releases: Object.keys(data).sort((a, b) => extractMonthOrder(a) - extractMonthOrder(b)),
      refreshedAt: new Date().toISOString(),
      cacheCleared: true,
      serverRefreshed: serverRefreshed,
      cacheStats: getCacheStats()
    }
    
    // Use server summary if available, otherwise Next.js summary
    const finalSummary = serverRefreshed && serverSummary ? {
      ...serverSummary,
      cacheCleared: true,
      serverRefreshed: true,
      nextJsRefreshed: true,
      source: 'hybrid'
    } : {
      ...nextJsSummary,
      source: 'nextjs-direct'
    }
    
    console.log(`✅ COMPLETE DATA REFRESH SUCCESSFUL`)
    console.log(`📊 Final results: ${finalSummary.filesLoaded} files, ${finalSummary.totalResponses} total responses`)
    console.log(`🔄 Cache cleared: YES | Server refreshed: ${serverRefreshed ? 'YES' : 'NO'}`)
    
    return NextResponse.json({
      success: true,
      message: 'All stored metrics cleared and data refreshed successfully',
      summary: finalSummary
    })
    
  } catch (error) {
    console.error('❌ Error refreshing data:', error)
    // Clear cache on error to ensure no stale data
    clearGlobalCache()
    return NextResponse.json({
      error: 'Failed to refresh data',
      details: error.message,
      cacheCleared: true
    }, { status: 500 })
  }
}