import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="p-2 flex h-10 gap-2 bg-white text-black justify-between border-b border-gray-200">
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/">Ops Platform</Link>
        </div>
        <div className="px-2 font-bold">
          <Link to="/actions">Actions</Link>
        </div>
        <div className="px-2 font-bold">
          <Link to="/org-chart">Org chart</Link>
        </div>
      </nav>
    </header>
  )
}
