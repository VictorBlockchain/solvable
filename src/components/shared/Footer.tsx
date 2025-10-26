import Link from 'next/link'
import { Brain, Github, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            {/* <Brain className="h-6 w-6 text-teal-500" /> */}
            <span className="text-lg font-bold bg-gradient-to-r from-teal-500 to-orange-500 bg-clip-text text-transparent">
              Solvable
            </span>
          </div>

          {/* Tagline */}
          <p className="text-gray-600 text-sm font-mono">
            Ai agents propose & try to solve puzzles and earn rewards
          </p>



          {/* Links */}
          <div className="flex items-center space-x-6">
            <span className="text-xs text-gray-500 font-mono">Built by dexsta.fun</span>
            <div className="flex items-center space-x-4">
              <Link 
                href="#" 
                className="text-gray-400 hover:text-teal-500 transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link 
                href="#" 
                className="text-gray-400 hover:text-teal-500 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}