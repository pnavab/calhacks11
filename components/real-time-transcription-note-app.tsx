'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Mic, MicOff } from "lucide-react"

// API call for saving notes
// const saveNote = async (content: string) => {
//   try {
//     const response = await fetch('/api/save-note', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ content }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const result = await response.json();
//     return { success: true, message: result.message || 'Note saved successfully' };
//   } catch (error) {
//     console.error('Error saving note:', error);
//     return { success: false, message: 'Failed to save note' };
//   }
// }

// Simulated API call for saving notes
const saveNote = async (content: string) => {
  await new Promise(resolve => setTimeout(resolve, 300)) // Simulate network delay
  console.log('Note saved:', content)
  return { success: true, message: 'Note saved successfully' }
}

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
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const debouncedSave = useCallback(
    debounce((content: string) => {
      setIsSaving(true)
      saveNote(content).then(result => {
        setIsSaving(false)
        setSaveStatus(result.message)
        setTimeout(() => setSaveStatus(''), 2000) // Clear status after 2 seconds
      })
    }, 1000),
    []
  )

  useEffect(() => {
    if (note) {
      debouncedSave(note)
    }
  }, [note, debouncedSave])

  const sendAudioChunk = async (audioChunk: Blob) => {
    try {
      const result = await transcribeAudioChunk(audioChunk)
      setNote(prevNote => prevNote + result.text)
      setError(null)
    } catch (error) {
      console.error('Error transcribing audio chunk:', error)
      setError('Failed to transcribe audio. Please try again.')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm', // Ensure consistent MIME type
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
  
      // Handle data available event
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          await sendAudioChunk(event.data); // Send each chunk as it arrives
        }
      };
  
      // Start recording with a time slice for chunks
      mediaRecorder.start(3000); // Creates a new Blob every 3 seconds
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Failed to access microphone. Please check your permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
          <Button
            onClick={toggleRecording}
            className={`${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            {isRecording ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
        </div>
      </header>
      <main className="flex-grow flex flex-col p-4">
        <div className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          <div className="relative flex-grow flex flex-col">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Start typing or recording your notes here..."
              className="flex-grow text-lg p-4 rounded-md shadow-inner resize-none focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out"
              aria-label="Note input"
            />
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
              {isSaving && (
                <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
              )}
              {saveStatus && (
                <span className="text-sm text-green-600">{saveStatus}</span>
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