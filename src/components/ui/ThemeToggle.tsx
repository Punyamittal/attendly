import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Button } from './Button'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className={className}
      aria-label="Toggle theme"
      type="button"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
