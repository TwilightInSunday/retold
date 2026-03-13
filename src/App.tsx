import { TitleBar } from './components/shell/TitleBar'
import { Toolbar } from './components/shell/Toolbar'
import { StatusBar } from './components/shell/StatusBar'
import { useSyncStore } from './store/sync'
import { useNotesStore } from './store/notes'
import './App.css'
import './styles/shell.css'

function App() {
  const syncStatus = useSyncStore((s) => s.status);
  const noteCount = useNotesStore((s) => s.notes.size);

  return (
    <div className="app">
      <TitleBar />
      <Toolbar />
      <main className="app__canvas">
        {/* Canvas will go here */}
      </main>
      <StatusBar syncStatus={syncStatus} noteCount={noteCount} />
    </div>
  )
}

export default App
