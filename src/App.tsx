import { TitleBar } from './components/shell/TitleBar'
import { Toolbar } from './components/shell/Toolbar'
import { StatusBar } from './components/shell/StatusBar'
import { Canvas } from './components/board/Canvas'
import { useSyncStore } from './store/sync'
import { useNotesStore } from './store/notes'
import { useBoardStore } from './store/board'
import './App.css'
import './styles/shell.css'
import './styles/board.css'

function App() {
  const syncStatus = useSyncStore((s) => s.status);
  const noteCount = useNotesStore((s) => s.notes.size);
  const resetViewport = useBoardStore((s) => s.resetViewport);

  return (
    <div className="app">
      <TitleBar />
      <Toolbar onResetView={resetViewport} />
      <Canvas />
      <StatusBar syncStatus={syncStatus} noteCount={noteCount} />
    </div>
  )
}

export default App
