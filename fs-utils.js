// import { ask } from './ask.ts'
import fs from 'fs'

export const home = () => Bun.env.HOME
// export const coprime = () =>
//   Bun.env.CI ? Bun.env.GITHUB_WORKSPACE : `${home()}/coprime`
export const coprime = () =>
  Bun.env.CI ? '/home/runner/work/coprime/coprime' : `${home()}/coprime`
export const etcoprime = () => `${home()}/etcoprime`
export const axiom = () => `${home()}/coprime/bun/axiom`

export const foldersToAvoid = [
  'node_modules',
  '.git',
  '.next',
  '.docz',
  '.turbo',
  '.vercel',
]

export const exists = filepath => {
  try {
    fs.statSync(filepath)
    return true
  } catch (error) {
    return false
  }
}

export const isDir = filepath => {
  if (exists(filepath)) {
    const stat = fs.statSync(filepath)
    return stat.isDirectory()
  }
  return false
}

export const isDirectory = isDir

export const isFile = filepath => {
  if (exists(filepath)) {
    const stat = fs.statSync(filepath)
    return stat.isFile()
  }
  return false
}

export const isSymlink = async filepath => {
  if (await exists(filepath)) {
    const info = fs.statSync(filepath)
    if (info.isSymlink()) return true
    return false
  }
}

export const getFileSize = async filepath => {
  if (await exists(filepath)) {
    const file = Bun.file(filepath)
    return file.size
  }
}

export const parsePath = filepath => {
  const directory = `${filepath.substring(0, filepath.lastIndexOf('/'))}/`
  const filename = filepath.substring(filepath.lastIndexOf('/') + 1)
  const basename = filepath.substring(filepath.lastIndexOf('/') + 1)
  const extension = filename.substring(filename.lastIndexOf('.') + 1)
  const filenameWithoutExtension = filename.substring(
    0,
    filename.lastIndexOf('.'),
  )
  return { directory, basename, filename, extension, filenameWithoutExtension }
}

export const files = (dir, options = {}) => {
  const { levels = 100, type = 'fullPaths', include = [] } = options
  let allFiles = []
  let isAvoided = false
  foldersToAvoid.forEach(folder => {
    if (dir.includes(folder) && !include.includes(folder)) {
      isAvoided = true
    }
  })
  if (isAvoided) return null
  if (isFile(dir)) return [dir]
  for (const i of fs.readdirSync(dir)) {
    const item = `${dir}/${i}`
    if (isDirectory(item) && levels > 1) {
      allFiles = allFiles.concat(files(item, { levels: levels - 1 }))
    } else if (isFile(item)) {
      allFiles = allFiles.concat(item)
    }
  }
  allFiles = allFiles.filter(file => file !== null)
  if (type === 'filename' || type === 'filenames') {
    return allFiles.map(file => parsePath(file).filename)
  }
  return allFiles
}

export const folders = dir => {
  const f = []
  for (const dirEntry of fs.readdirSync(dir)) {
    if (isDirectory(`${dir}/${dirEntry}`)) f.push(dirEntry)
  }
  return f
}

export const createDir = fp => {
  let filepath = fp
  if (filepath[filepath.length - 1] !== '/') filepath = `${filepath}/`
  fs.mkdirSync(filepath, { recursive: true })
}

export const read = async (filepath, options) => {
  try {
    const file = Bun.file(filepath)
    const text = await file.text()
    if (filepath.includes('.json')) {
      try {
        const json = JSON.parse(text.trim())
        return json
      } catch (jsonErr) {
        if (options.throwErrors) throw jsonErr
        console.error(jsonErr)
      }
    }
    return text
  } catch (e) {
    return null
  }
}

export const rm = filepath => {
  if (!exists(filepath)) return
  try {
    fs.rmSync(filepath)
  } catch (e) {
    console.error(e)
  }
}

export const rmrf = filepath => {
  if (!exists(filepath)) return
  try {
    fs.rmdirSync(filepath, { recursive: true })
  } catch (e) {
    console.error(e)
  }
}

export const copyFile = (pathFrom, pathTo) => {
  const { filename } = parsePath(pathFrom)
  if (!exists(pathTo)) createDir(pathTo)
  if (isDir(pathTo)) {
    fs.copyFileSync(pathFrom, `${pathTo}/${filename}`)
  } else {
    fs.copyFileSync(pathFrom, pathTo)
  }
}

const copyFiles = (source, tgt, options) => {
  let target = tgt
  if (options?.createDir) {
    const { filename } = parsePath(source)
    target = `${tgt}/${filename}`
    createDir(target)
  }
  for (const dirEntry of fs.readdirSync(source)) {
    const currentFileOrDirectory = `${source}/${dirEntry}`
    const targetPath = `${target}/${dirEntry}`
    if (isDir(dirEntry) && !exists(targetPath)) {
      createDir(targetPath)
    }
    if (
      isDir(currentFileOrDirectory) &&
      !foldersToAvoid.some(avoid => currentFileOrDirectory.includes(avoid))
    ) {
      copyFiles(currentFileOrDirectory, targetPath)
    }
    if (isFile(currentFileOrDirectory)) {
      copyFile(currentFileOrDirectory, target)
    }
  }
}

// Possibilities:
//   source is a directory, target is a directory that exists
//     - copy the directory into the target directory recursively
//   source is a directory, target is a directory that doesn't exist
//     - create all directories to the target directory and copy over the source directory into it recursively
//   x - source is a directory, target is a file exists
//     - show an error that the source is a directory and the target is a file, return
//   x - source is a directory, target is a file that doesn't exist
//     - throw an error that source is a directory and target path looks like a file
//   source is a file, target is a directory exists
//     - copy the file into the target dir
//   source is a file, target is a directory that doesn't exist
//     - create all directories to the target directory and copy over the source file into it
//   source is a file, target is a file that exists
//     - check that you want to overwrite
//   source is a file, target is a file that doesn't exist
//     - create all directories to the target path and create the file
// */
export const copy = async (source, target, options = {}) => {
  let exit = false
  foldersToAvoid.forEach(folder => {
    if (source.includes(folder)) exit = true
  })
  if (exit) return null

  if (isDir(source)) {
    // source is a directory that exists
    if (isDir(target)) {
      // target is a directory that exists
      copyFiles(source, target, options)
    } else if (isFile(target)) {
      // target is a file
      throw new Error('Error: cannot copy a folder onto a file.')
    } else if (target.lastIndexOf('.') > 0) {
      // target does not exist
      const { targetShouldHavePeriod } = options
      if (targetShouldHavePeriod) {
        copyFiles(source, target, options)
      } else {
        throw new Error(
          'Error: target path looks like a file. If this is desired, pass in the option { targetShouldHavePeriod: true }',
        )
      }
    } else {
      copyFiles(source, target, options)
    }
  } else if (isFile(source)) {
    // source is a file
    if (isDir(target)) {
      // target is a directory
      copyFile(source, target)
    } else if (isFile(target)) {
      // target is a file
      const shouldOverwrite = true
      // const shouldOverwrite =
      //   typeof options.answer !== 'undefined'
      //     ? options.answer
      //     : await ask(`${target} already exists. Overwrite?`, 'yn', {
      //         default: 'n',
      //       })

      if (shouldOverwrite) {
        copyFile(source, target)
      }
    } else if (target.lastIndexOf('.') > 0) {
      // target does not exist yet
      // target will be a file
      const { directory } = parsePath(target)
      if (!exists(directory)) createDir(directory)
      fs.copyFileSync(source, target)
    } else {
      // target will be a folder
      copyFile(source, target)
    }
  } else {
    // source does not exist yet
  }
}

export const write = async (filepath, c, options = { overwrite: true }) => {
  let contents = c
  // if (options.overwrite) {
  //   await copy(filepath, `${etcoprime()}/graveyard/writeBackups`)
  // }
  const { directory, filename, extension } = parsePath(filepath)
  if (!exists(directory)) createDir(directory)
  if (!filename) return new Error('Write to a file please')
  if (options.overwrite && exists(filepath)) {
    rm(filepath)
  }
  if (extension === 'json' && !options.jsonAsText) {
    try {
      contents = `${JSON.stringify(contents, null, 2)}\n`
    } catch (err) {
      console.error(err)
    }
  }
  await Bun.write(filepath, contents)
}
