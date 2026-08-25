import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 8787
const projectDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const dataFile = path.join(dataDirectory, 'reports.json')

app.use(express.json({ limit: '1mb' }))

const readReports = async () => {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'))
  } catch {
    await fs.mkdir(dataDirectory, { recursive: true })
    await fs.writeFile(dataFile, '[]', 'utf8')
    return []
  }
}

const writeReports = (reports) => fs.writeFile(dataFile, JSON.stringify(reports, null, 2), 'utf8')

app.get('/api/reports', async (_request, response) => {
  response.json(await readReports())
})

app.post('/api/reports', async (request, response) => {
  const reports = await readReports()
  const report = { ...request.body, id: Date.now() }
  reports.unshift(report)
  await writeReports(reports)
  response.status(201).json(report)
})

app.patch('/api/reports/:id', async (request, response) => {
  const reports = await readReports()
  const reportIndex = reports.findIndex((report) => String(report.id) === request.params.id)
  if (reportIndex === -1) return response.sendStatus(404)

  reports[reportIndex] = { ...reports[reportIndex], status: request.body.status }
  await writeReports(reports)
  response.json(reports[reportIndex])
})

const distDirectory = path.join(projectDirectory, 'dist')
app.use(express.static(distDirectory))
app.use((_request, response) => {
  response.sendFile(path.join(distDirectory, 'index.html'))
})

app.listen(port, '0.0.0.0', () => {
  console.log(`App server: http://0.0.0.0:${port}`)
})