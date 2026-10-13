import './globals.css'

export const metadata = {
  title: 'SyncBoard — Collaborative Whiteboard',
  description: 'Real-time collaborative whiteboard for developers, designers, and teams.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="overflow-hidden">
        {children}
      </body>
    </html>
  )
}
