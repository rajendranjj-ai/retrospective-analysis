import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const debug = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        cwd: process.cwd()
      },
      directories: {},
      files: {}
    }

    // Check various directories
    const dirsToCheck = [
      '.',
      './public',
      './public/Retrospectives',
      './Retrospectives',
      'public',
      'public/Retrospectives',
      'Retrospectives'
    ]

    for (const dir of dirsToCheck) {
      try {
        const fullPath = path.join(process.cwd(), dir)
        const exists = fs.existsSync(fullPath)
        debug.directories[dir] = {
          fullPath,
          exists,
          files: exists ? fs.readdirSync(fullPath) : []
        }
      } catch (error) {
        debug.directories[dir] = {
          error: error.message
        }
      }
    }

    // Specifically check for Excel files in public/Retrospectives
    try {
      const retroPath = path.join(process.cwd(), 'public', 'Retrospectives')
      if (fs.existsSync(retroPath)) {
        const files = fs.readdirSync(retroPath)
        const excelFiles = files.filter(f => f.endsWith('.xlsx'))
        debug.files.publicRetrospectives = {
          allFiles: files,
          excelFiles: excelFiles,
          excelCount: excelFiles.length
        }
      }
    } catch (error) {
      debug.files.publicRetrospectives = { error: error.message }
    }

    return NextResponse.json(debug, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}