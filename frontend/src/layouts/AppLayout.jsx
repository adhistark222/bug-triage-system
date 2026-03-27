function AppLayout({ children }) {
  return (
    <main className="app-shell">
      <div className="app-shell__content">{children}</div>
    </main>
  )
}

export default AppLayout
