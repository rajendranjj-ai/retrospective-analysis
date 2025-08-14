import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    console.log('Debug API endpoint called');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      currentWorkingDirectory: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    // Check various paths
    const pathsToCheck = [
      '.',
      './Retrospectives',
      '../Retrospectives',
      '../../Retrospectives',
      '../../../Retrospectives'
    ];
    
    const pathResults = {};
    
    for (const checkPath of pathsToCheck) {
      try {
        const fullPath = path.resolve(checkPath);
        const exists = fs.existsSync(fullPath);
        const isDirectory = exists ? fs.statSync(fullPath).isDirectory() : false;
        
        let files = [];
        if (exists && isDirectory) {
          try {
            files = fs.readdirSync(fullPath);
            // Filter to show only first 10 files to avoid huge responses
            files = files.slice(0, 10);
          } catch (readError) {
            files = [`Error reading: ${readError.message}`];
          }
        }
        
        pathResults[checkPath] = {
          fullPath,
          exists,
          isDirectory,
          files,
          error: null
        };
      } catch (error) {
        pathResults[checkPath] = {
          fullPath: path.resolve(checkPath),
          exists: false,
          isDirectory: false,
          files: [],
          error: error.message
        };
      }
    }
    
    debugInfo.pathResults = pathResults;
    
    // Try to read package.json to verify we're in the right place
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        debugInfo.packageJson = {
          name: packageJson.name,
          version: packageJson.version
        };
      }
    } catch (packageError) {
      debugInfo.packageJson = { error: packageError.message };
    }
    
    console.log('Debug info collected:', debugInfo);
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 