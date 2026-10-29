import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { FloatWindow } from '@/components/FloatWindow'
import { CollapseBall } from '@/components/CollapseBall'
import { useAppStore } from '@/store'
import './App.css'

export default function App() {
  const [showFloat, setShowFloat] = useState(true)
  const settings = useAppStore((s) => s.settings)
  const theme = settings.theme

  // 主题同步：documentElement class + localStorage（持久化）
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme !== 'light')
    try {
      localStorage.setItem('focus-flow-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const handleCollapse = () => {
    setShowFloat(false)
  }

  const handleExpand = () => {
    setShowFloat(true)
  }

  if (!showFloat) {
    return (
      <CollapseBall
        onExpand={handleExpand}
        showFloat={false}
      />
    )
  }

  return (
    <FloatWindow onCollapse={handleCollapse}>
      <Toaster />
    </FloatWindow>
  )
}
