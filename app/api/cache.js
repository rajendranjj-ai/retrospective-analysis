// Global cache management for retrospective data
let globalDataCache = null
let cacheTimestamp = null

// Clear global cache (clears ALL stored metrics and cached data)
export function clearGlobalCache() {
  const wasEmpty = !globalDataCache
  const previousCount = globalDataCache ? Object.keys(globalDataCache).length : 0
  const previousResponses = globalDataCache ? Object.values(globalDataCache).reduce((sum, monthData) => sum + monthData.length, 0) : 0
  
  globalDataCache = null
  cacheTimestamp = null
  
  if (wasEmpty) {
    console.log('🗑️ Cache was already empty')
  } else {
    console.log(`🗑️ ALL STORED METRICS CLEARED - Removed ${previousCount} releases (${previousResponses} responses) from cache`)
  }
}

// Set cached data
export function setCachedData(data) {
  globalDataCache = data
  cacheTimestamp = Date.now()
  console.log(`💾 Data cached: ${Object.keys(data).length} releases, ${Object.values(data).reduce((sum, monthData) => sum + monthData.length, 0)} total responses`)
}

// Get cached data
export function getCachedData() {
  if (globalDataCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp
    console.log(`📋 Using cached data (age: ${age}ms, releases: ${Object.keys(globalDataCache).length})`)
    return globalDataCache
  }
  
  console.log('📋 No cached data available')
  return null
}

// Check if cache is valid (optional age check)
export function isCacheValid(maxAge = 60000) { // Default 60 seconds
  if (!globalDataCache || !cacheTimestamp) {
    return false
  }
  
  const age = Date.now() - cacheTimestamp
  return age < maxAge
}

// Get cache statistics
export function getCacheStats() {
  if (!globalDataCache || !cacheTimestamp) {
    return { cached: false }
  }
  
  return {
    cached: true,
    age: Date.now() - cacheTimestamp,
    releases: Object.keys(globalDataCache).length,
    totalResponses: Object.values(globalDataCache).reduce((sum, monthData) => sum + monthData.length, 0),
    cacheTimestamp: cacheTimestamp
  }
}