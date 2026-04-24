import { useState } from 'react'
import './App.css'

const cvList = [
  {
    id: 'general',
    file: '/cv-general.html',
    badge: 'General',
    badgeColor: '#2e7d32',
    badgeBg: '#e8f5e9',
    title: 'General Frontend Developer CV',
    description: 'Standard CV for general frontend positions.',
  },
  {
    id: 'echologyx',
    file: '/cv-echologyx.html',
    badge: 'Tailored',
    badgeColor: '#1565c0',
    badgeBg: '#e3f2fd',
    title: 'Echologyx - Mid Level Frontend Engineer',
    description: 'Tailored for Echologyx Ltd.',
  },
  {
    id: 'fullstack',
    file: '/cv-fullstack.html',
    badge: 'Full Stack',
    badgeColor: '#6a1b9a',
    badgeBg: '#f3e5f5',
    title: 'Full Stack Developer CV',
    description: 'Frontend + backend, APIs, databases.',
  },
]

function App() {
  const [selected, setSelected] = useState(null)

  const handleDownload = (file) => {
    const printWindow = window.open(file, '_blank')
    printWindow.addEventListener('load', () => {
      setTimeout(() => printWindow.print(), 500)
    })
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>My CVs</h1>
          <p>Select a CV to preview</p>
        </div>

        <div className="cv-list">
          {cvList.map((cv) => (
            <div
              key={cv.id}
              className={`cv-item ${selected?.id === cv.id ? 'active' : ''}`}
              onClick={() => setSelected(cv)}
            >
              <span
                className="cv-badge"
                style={{ background: cv.badgeBg, color: cv.badgeColor }}
              >
                {cv.badge}
              </span>
              <h3>{cv.title}</h3>
              <p>{cv.description}</p>
              <button
                className="btn btn-download"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(cv.file)
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Preview */}
      <main className="preview">
        {selected ? (
          <>
            <div className="preview-toolbar">
              <span className="preview-title">{selected.title}</span>
              <button
                className="btn btn-download"
                onClick={() => handleDownload(selected.file)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Download PDF
              </button>
            </div>
            <iframe className="preview-frame" src={selected.file} title="CV Preview" />
          </>
        ) : (
          <div className="preview-empty">
            <svg viewBox="0 0 24 24" width="56" height="56" fill="#d0d0d0">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 20V4h5v7h7v9H6z" />
            </svg>
            <p>Select a CV from the sidebar to preview</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
