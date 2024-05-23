import 'public/main.css'

const Layout = ({ children }) => {
  return (
    <html>
      <body>
        <div>
          {children}
        </div>
      </body>
    </html>
  )
}
export default Layout