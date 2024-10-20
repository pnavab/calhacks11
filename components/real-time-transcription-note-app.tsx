"use client";

import React,{ useState, useCallback, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, MicOff, Plus, X, Image } from "lucide-react";
import ReactMarkdown from "react-markdown";
import DiagramGenerator from "@/components/diagram-generator";
import mermaid from "mermaid";
import DiagramModal from '@/components/diagram-modal';

const DEBOUNCE_DELAY = 4000;
const CYCLE_DURATION = 2000;

// API call for saving notes
const summarizeNote = async (
  previousSummary: string,
  transcriptChunk: string,
  currentContext: string,
  existingContexts: string[],
  allNotes: any
) => {
  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previousSummary,
        transcriptChunk,
        currentContext,
        existingContexts,
        allNotes,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const validatedData = await response.json();
    return {
      success: true,
      existingContexts: [...validatedData.existingContexts],
      currentContext: validatedData.currentContext,
      summary: validatedData.summary,
      createNewContext: validatedData.createNewContext,
      message: "Note summarized successfully",
    };
  } catch (error) {
    console.error("Error summarizing note:", error);
    return {
      success: false,
      subpages: [],
      message: "Failed to summarize note",
    };
  }
};

// API call for transcribing audio chunks
const transcribeAudioChunk = async (audioChunk: Blob, text: string) => {
  try {
    const formData = new FormData();
    formData.set("audio", audioChunk, "audio.webm");
    formData.append("text", text);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { text: result.transcription };
  } catch (error) {
    console.error("Error transcribing audio chunk:", error);
    throw error;
  }
};

interface Diagram {
  id: string;
  code: string;
  text: string;
}

interface Note {
  title: string;
  content: string;
  diagrams: Diagram[];
}

export default function Component() {
  const [notes, setNotes] = useState<Note[]>([
    { title: "Untitled Note", content: "", diagrams: [] },
  ]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageTitle, setCurrentPageTitle] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeStatus, setSummarizeStatus] = useState("");
  const [isCycling, setIsCycling] = useState(false);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastClickTime, setLastClickTime] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showDiagrams, setShowDiagrams] = useState(false);
  const [currentDiagram, setCurrentDiagram] = useState<Diagram | null>(null);
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);
  const [diagramText, setDiagramText] = useState("");
  const [canGenerateDiagram, setCanGenerateDiagram] = useState(false);
  const [zoomedDiagram, setZoomedDiagram] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const newTabInputRef = useRef<HTMLInputElement>(null);

  const [pendingContent, setPendingContent] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTextRef = useRef("");

  //API call for exporting the notes
  const exportNotes = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notes),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // console.log("Notes exported successfully");
    } catch (error) {
      console.error("Error exporting notes:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const summarizeContent = useCallback(
    (content: string) => {
      setIsSummarizing(true);
      const titles = notes.map((note) => note.title);
      // console.log("all notes is", notes);
      summarizeNote(
        notes[currentPage].content,
        content,
        currentPageTitle,
        titles,
        notes
      ).then((result) => {
        setIsSummarizing(false);
        setSummarizeStatus(result.message);
        if (result.success) {
          setNotes((oldNotes) => {
            const newNotes = [...oldNotes];
            const currentNote = newNotes[currentPage];
            const isDefaultTitle = currentNote.title.startsWith("Untitled Note");
            const isEmptyNote = currentNote.content.trim() === "";
            const newNote = {
              title: result.currentContext,
              content: result.summary,
              diagrams: [],
            };

            if (isDefaultTitle && isEmptyNote) {
              // If it's the default title and empty, update the current note
              newNotes[currentPage] = newNote;
            } else {
              const noteIndex = newNotes.findIndex(
                (note) => note.title === newNote.title
              );

              if (noteIndex !== -1) {
                // Update the existing note at the found index
                newNotes[noteIndex] = newNote;
                setCurrentPage(noteIndex);
              } else if (!result.createNewContext) {
                // Update the current page if no new context is created
                newNotes[currentPage] = newNote;
              } else {
                // Add a new note if a new context is created
                newNotes.push(newNote);
                setCurrentPage(newNotes.length - 1);
              }
            }
            return newNotes;
          });
          setCurrentPageTitle(result.currentContext);
          setPendingContent("");
        }
        setTimeout(() => setSummarizeStatus(""), 3000);
      });
    },
    [notes, currentPage, currentPageTitle]
  );

  // Update the handleManualInput function
  const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setPendingContent(newContent);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Check if the input event is a paste event
    if (e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertFromPaste') {
      // Immediately summarize for paste events
      summarizeContent(newContent);
    } else {
      // Use debounce for regular typing
      timerRef.current = setTimeout(() => {
        summarizeContent(newContent);
      }, DEBOUNCE_DELAY);
    }
  };
  // Handle changes in the pending content for transcribed audio
  const handleTranscribedInput = (newContent: string) => {
    setPendingContent((prevContent) => prevContent + " " + newContent);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      summarizeContent(pendingContent + " " + newContent);
    }, DEBOUNCE_DELAY);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        try {
          const result = await transcribeAudioChunk(audioBlob, pendingContent);
          handleTranscribedInput(result.text);
        } catch (error) {
          console.error("Transcription error:", error);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const addNewPage = () => {
    const newNotes = [
      ...notes,
      { title: `Untitled Note ${notes.length + 1}`, content: "", diagrams: [] },
    ];
    setNotes(newNotes);
    setCurrentPage(newNotes.length - 1);
    setEditingTitle(newNotes.length - 1);
    setCurrentDiagram(null);
    setTimeout(() => {
      if (newTabInputRef.current) {
        newTabInputRef.current.focus();
      }
    }, 0);
  };

  const removePage = (indexToRemove: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (notes.length > 1) {
      setNotes((prevNotes) => prevNotes.filter((_, index) => index !== indexToRemove));
      if (currentPage >= indexToRemove && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
      setShowDiagrams(false);
      setCurrentDiagram(null);
    }
  };

  const updatePageTitle = (index: number) => {
    if (currentPageTitle.trim() !== "") {
      setNotes((prevNotes) => {
        const updatedNotes = [...prevNotes];
        updatedNotes[index] = { ...updatedNotes[index], title: currentPageTitle.trim() };
        return updatedNotes;
      });
    }
    setEditingTitle(null);
  };

  const handleTitleClick = (index: number) => {
    const currentTime = new Date().getTime();

    if (lastClickTime && currentTime - lastClickTime < 300) {
      // Double click detected
      setEditingTitle(index);
      setLastClickTime(null); // Reset last click time
    } else {
      // Single click
      setCurrentPage(index);
      setLastClickTime(currentTime);
    }
  };

  const handleTitleBlur = () => {
    setEditingTitle(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      setEditingTitle(null);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecordingCycle = useCallback(() => {
    setIsCycling(true);
    const runCycle = () => {
      startRecording();
      cycleTimeoutRef.current = setTimeout(() => {
        stopRecording();
        if (isCycling) {
          runCycle();
        }
      }, CYCLE_DURATION);
    };
    runCycle();
  }, [CYCLE_DURATION, isCycling]);

  const stopRecordingCycle = useCallback(() => {
    setIsCycling(false);
    stopRecording();
    if (cycleTimeoutRef.current) {
      clearTimeout(cycleTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (isCycling) {
      startRecordingCycle();
    } else {
      stopRecordingCycle();
    }
  }, [isCycling, startRecordingCycle, stopRecordingCycle]);

  const toggleRecording = () => {
    setIsCycling((prev) => !prev);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const handleNoteEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNotes(prevNotes => {
      const newNotes = [...prevNotes];
      newNotes[currentPage] = { ...newNotes[currentPage], content: newContent };
      return newNotes;
    });
  };

  const handleViewClick = () => {
    setEditMode(true);
  };

  const handleEditBlur = () => {
    setEditMode(false);
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setDiagramText(selection.toString());
      setCanGenerateDiagram(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
    };
  }, [handleTextSelection]);

  const handleGenerateDiagram = async () => {
    if (diagramText) {
      setIsGeneratingDiagram(true);
      setShowDiagrams(true);
      try {
        const response = await fetch("/api/diagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: diagramText }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.mermaidCode) {
          const newDiagram: Diagram = {
            id: Date.now().toString(),
            code: data.mermaidCode,
            text: diagramText,
          };
          setNotes(prevNotes => {
            const updatedNotes = [...prevNotes];
            updatedNotes[currentPage] = {
              ...updatedNotes[currentPage],
              diagrams: [...updatedNotes[currentPage].diagrams, newDiagram],
            };
            return updatedNotes;
          });
          setCurrentDiagram(newDiagram);
        } else {
          console.error("Failed to generate diagram: No mermaidCode in response");
        }
      } catch (error) {
        console.error("Error generating diagram:", error);
      } finally {
        setIsGeneratingDiagram(false);
        setCanGenerateDiagram(false);
      }
    }
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };

  const highlightText = (text: string, highlightedText: string) => {
    if (!highlightedText) return text;
    const escapedHighlightedText = escapeRegExp(highlightedText);
    const parts = text.split(new RegExp(`(${escapedHighlightedText})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlightedText.toLowerCase() 
        ? <mark key={i}>{part}</mark> 
        : part
    );
  };

  const renderMarkdown = (content: string) => {
    return (
      <ReactMarkdown
        components={{
          p: ({node, ...props}) => {
            const children = React.Children.toArray(props.children);
            return (
              <p {...props}>
                {children.map((child, index) => 
                  typeof child === 'string' 
                    ? highlightText(child, currentDiagram?.text || '')
                    : child
                )}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
  }, []);

  // Update the setCurrentPage function to reset currentDiagram
  const handleSetCurrentPage = (index: number) => {
    setCurrentPage(index);
    const currentNoteDiagrams = notes[index].diagrams;
    if (currentNoteDiagrams.length > 0) {
      setCurrentDiagram(currentNoteDiagrams[0]);
      setShowDiagrams(true);
    } else {
      setCurrentDiagram(null);
      setShowDiagrams(false);
    }
  };

  const handleDiagramClick = (diagramCode: string) => {
    setZoomedDiagram(diagramCode);
  };

  const closeModal = () => {
    setZoomedDiagram(null);
  };

  return (
    <div className="max-h-[calc(100vh-28px)] bg-gray-50 flex flex-col w-full">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-4xl font-[1000] text-gray-900">Noq</h1>
          <div className="flex items-center space-x-4">
            <Button
              onClick={toggleRecording}
              className={isCycling ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
            >
              {isCycling ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
              {isCycling ? "Stop Recording" : "Start Recording"}
            </Button>
            <Button onClick={exportNotes} className="bg-green-500 hover:bg-green-600">
              {isExporting ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                "Export Notes"
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow flex p-4 w-full h-[calc(100vh-100px)]">
        <div className={`${showDiagrams ? 'w-2/3' : 'w-full'} h-full flex flex-col`}>
          <div className="flex items-center space-x-2 overflow-x-auto mb-4 pr-32 relative">
            {notes.map((note, index) => (
              <div key={index} className="flex-shrink-0 relative group">
                {editingTitle === index ? (
                  <Input
                    ref={index === notes.length - 1 ? newTabInputRef : null}
                    value={currentPageTitle}
                    onChange={(e) => setCurrentPageTitle(e.target.value)}
                    onBlur={() => updatePageTitle(index)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        updatePageTitle(index);
                      }
                    }}
                    className="w-32 text-sm"
                  />
                ) : (
                  <Button
                    onClick={() => handleSetCurrentPage(index)}
                    onDoubleClick={() => {
                      setEditingTitle(index);
                      setCurrentPageTitle(note.title);
                    }}
                    className={`
                      ${currentPage === index
                        ? "bg-blue-500 text-white hover:bg-blue-500"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      } transition-colors duration-200 pr-8
                    `}
                  >
                    {note.title}
                  </Button>
                )}
                {notes.length > 1 && (
                  <button
                    onClick={(e) => removePage(index, e)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addNewPage}
              className="inline-flex justify-center items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 size-10"
              aria-label="Add new note"
            >
              <Plus className="size-6" />
            </button>
            <Button
              onClick={handleGenerateDiagram}
              className={`absolute right-0 bg-purple-500 hover:bg-purple-600 ${canGenerateDiagram ? 'opacity-100' : 'opacity-50'}`}
              disabled={!canGenerateDiagram || isGeneratingDiagram}
            >
              {isGeneratingDiagram ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Image className="mr-2" />
              )}
              {isGeneratingDiagram ? 'Generating...' : 'Generate Diagram'}
            </Button>
          </div>
          <div className="flex-grow flex flex-col h-[calc(100%-4rem)]">
            <div className="h-3/4 mb-4">
              {editMode ? (
                <Textarea
                  value={notes[currentPage]?.content || ""}
                  onChange={handleNoteEdit}
                  onBlur={handleEditBlur}
                  placeholder="Edit your note here..."
                  className="w-full h-full text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none"
                  aria-label="Edit Note"
                  autoFocus
                />
              ) : (
                <div 
                  onClick={handleViewClick}
                  className="w-full h-full bg-white border-2 text-lg p-4 rounded-md shadow-inner focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out overflow-y-auto cursor-text"
                >
                  {renderMarkdown(notes[currentPage]?.content || "Click to edit...")}
                </div>
              )}
            </div>
            <div className="h-1/4 relative">
              <Textarea
                value={pendingContent}
                onChange={handleManualInput}
                onPaste={(e) => {
                  // Prevent default to avoid double paste
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  const newContent = pendingContent + pastedText;
                  setPendingContent(newContent);
                  summarizeContent(newContent);
                }}
                placeholder="Type or record your notes here..."
                className="w-full h-full text-lg p-2 rounded-lg shadow-inner bg-blue-100 focus:ring-2 focus:ring-blue-300 transition-all duration-300 ease-in-out resize-none"
                aria-label="Pending Note Input"
              />
              <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                {isSummarizing && (
                  <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                )}
                {summarizeStatus && (
                  <span className="text-sm text-green-600">
                    {summarizeStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
        {showDiagrams && notes[currentPage].diagrams.length > 0 && (
          <div className="w-1/3 h-full ml-4 bg-white border-2 rounded-md shadow-inner p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Generated Diagrams</h3>
            <div className="flex flex-wrap mb-4">
              {notes[currentPage].diagrams.map((diagram, index) => (
                <Button
                  key={diagram.id}
                  onClick={() => setCurrentDiagram(diagram)}
                  className={`mr-2 mb-2 ${currentDiagram?.id === diagram.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  Diagram {index + 1}
                </Button>
              ))}
            </div>
            {currentDiagram && (
              <>
                <h4 className="text-md font-semibold mb-2">Selected Diagram</h4>
                <div 
                  onClick={() => setZoomedDiagram(currentDiagram.code)} 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <DiagramGenerator key={currentDiagram.id} mermaidCode={currentDiagram.code} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Based on:</strong>
                  <ReactMarkdown className="markdown-content">
                    {currentDiagram.text}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      {zoomedDiagram && (
        <DiagramModal mermaidCode={zoomedDiagram} onClose={() => setZoomedDiagram(null)} />
      )}
    </div>
  );
}
