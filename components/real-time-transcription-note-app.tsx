'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Mic, MicOff, Plus, X } from "lucide-react"

// API call for saving notes
const summarizeNote = async (content: string) => {
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, subpages: result.subpages, message: 'Note summarized successfully' };
  } catch (error) {
    console.error('Error summarizing note:', error);
    return { success: false, subpages: [], message: 'Failed to summarize note' };
  }
}

// Simulated API call for saving notes
// const summarizeNote = async (content: string) => {
//   await new Promise(resolve => setTimeout(resolve, 300)) // Simulate network delay
//   console.log('Note saved:', content)
//   // @ts-ignore
//   return { success: true, subpages: result.subpages,message: 'Note summarized successfully' }
// }

// API call for transcribing audio chunks
const transcribeAudioChunk = async (audioChunk: Blob) => {
  try {
    const formData = new FormData();
    formData.set('audio', audioChunk, 'audio.webm');

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { text: result.transcription };
  } catch (error) {
    console.error('Error transcribing audio chunk:', error);
    throw error;
  }
};

export default function Component() {
  const [notes, setNotes] = useState<{ title: string; content: string }[]>([{title: 'Untitled Note', content: ''}])
  const [currentPage, setCurrentPage] = useState(0)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summarizeStatus, setSummarizeStatus] = useState('')
  const cycleDuration = 2000 // 3 seconds in milliseconds
  const [isCycling, setIsCycling] = useState(false)
  const [editingTitle, setEditingTitle] = useState<number | null>(null)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const newTabInputRef = useRef<HTMLInputElement>(null)

  const debouncedSummarize = useCallback(
    debounce((content: string) => {
      setIsSummarizing(true)
      summarizeNote(content).then(result => {
        setIsSummarizing(false)
        setSummarizeStatus(result.message)
        if (result.success && result.subpages.length > 0) {
          setNotes(result.subpages.map((subpage: string, index: number) => ({ title: `Page ${index + 1}`, content: subpage })))
          setCurrentPage(0)
        }
        setTimeout(() => setSummarizeStatus(''), 2000) // Clear status after 2 seconds
      })
    }, 1000), [])

  useEffect(() => {
    if (notes[currentPage]) {
      debouncedSummarize(notes[currentPage].content)
    }
  }, [notes, currentPage, debouncedSummarize])

  useEffect(() => {
    return () => {
      // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      const mediaRecorder = new MediaRecorder(streamRef.current)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        try {
          const result = await transcribeAudioChunk(audioBlob)
          // this doesn't look like its correct, gotta make sure we are apending to the right note number
          setNotes(prevNotes => [...prevNotes, { title: 'Untitled Note', content: result.text }])
        } catch (error) {
          console.error('Transcription error:', error)
        }
      }

      mediaRecorder.start()
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = [...notes]
    newNotes[currentPage] = { ...newNotes[currentPage], content: e.target.value }
    setNotes(newNotes)
  }

  const addNewPage = () => {
    const newNotes = [...notes, { title: 'Untitled Note', content: '' }]
    setNotes(newNotes)
    setCurrentPage(newNotes.length - 1)
    setEditingTitle(newNotes.length - 1)
    setTimeout(() => {
      if (newTabInputRef.current) {
        newTabInputRef.current.focus()
      }
    }, 0)
  }

  const removePage = (index: number) => {
    if (notes.length > 1) {
      const newNotes = notes.filter((_, i) => i !== index)
      setNotes(newNotes)
      setCurrentPage(Math.min(index, newNotes.length - 1))
    }
  }

  const updatePageTitle = (index: number, newTitle: string) => {
    const newNotes = [...notes]
    newNotes[index] = { ...newNotes[index], title: newTitle }
    setNotes(newNotes)
  }

  const handleTitleClick = (index: number) => {
    setEditingTitle(index)
  }

  const handleTitleBlur = () => {
    setEditingTitle(null)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      setEditingTitle(null)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const startRecordingCycle = useCallback(() => {
    setIsCycling(true)
    const runCycle = () => {
      startRecording()
      cycleTimeoutRef.current = setTimeout(() => {
        stopRecording()
        if (isCycling) {
          runCycle()
        }
      }, cycleDuration)
    }
    runCycle()
  }, [cycleDuration, isCycling])

  const stopRecordingCycle = useCallback(() => {
    setIsCycling(false)
    stopRecording()
    if (cycleTimeoutRef.current) {
      clearTimeout(cycleTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (isCycling) {
      startRecordingCycle()
    } else {
      stopRecordingCycle()
    }
  }, [isCycling, startRecordingCycle, stopRecordingCycle])

  const toggleRecording = () => {
    setIsCycling(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-4xl font-[1000] text-gray-900">Notes</h1>
          <Button onClick={toggleRecording} className={isCycling ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}>
            {isCycling ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
            {isCycling ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
      </header>
      <main className="flex-grow flex flex-col p-4">
        <div className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {notes.map((note, index) => (
              <div
                key={index}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-lg font-semibold ${
                  currentPage === index
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {editingTitle === index ? (
                  <Input
                    ref={newTabInputRef}
                    type="text"
                    value={note.title}
                    onChange={(e) => updatePageTitle(index, e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="w-32 bg-transparent border-none focus:outline-none text-center text-lg"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => {
                      setCurrentPage(index)
                      handleTitleClick(index)
                    }}
                    className="focus:outline-none w-32 h-10"
                  >
                    {note.title}
                  </button>
                )}
                {notes.length > 1 && (
                  <button
                    onClick={() => removePage(index)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                    aria-label={`Remove ${note.title}`}
                  >
                    <X className="size-6" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addNewPage}
              className="inline-flex justify-center items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 size-14"
              aria-label="Add new note"
            >
              <Plus className="size-6" />
            </button>
          </div>
          <div className="relative flex-grow flex flex-col mt-4">
            <Textarea
              value={notes[currentPage]?.content || ''}
              onChange={handleNoteChange}
              placeholder="Start typing or recording your notes here..."
              className="flex-grow text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out"
              aria-label="Note input"
            />
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              {isSummarizing && (
                <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
              )}
              {summarizeStatus && (
                <span className="text-sm text-green-600">{summarizeStatus}</span>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function(this: any, ...args: Parameters<F>) {
    const context = this
    if (timeout !== null) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(context, args), wait)
  }
}