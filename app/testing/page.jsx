'use client'

import { useState, useRef } from 'react';

const WebMRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const mediaRecorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
      };

      mediaRecorder.current.start();
      setRecording(true);

      // Stop recording after 1 second
      setTimeout(() => {
        mediaRecorder.current.stop();
        setRecording(false);
        stream.getTracks().forEach(track => track.stop());
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const saveRecording = async () => {
    if (recordedBlob) {
      try {
        // Check if the File System Access API is supported
        if ('showSaveFilePicker' in window) {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'recording.webm',
            types: [{
              description: 'WebM Files',
              accept: {'audio/webm': ['.webm']},
            }],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(recordedBlob);
          await writable.close();
          
          console.log('File saved successfully');
        } else {
          throw new Error('File System Access API not supported');
        }
      } catch (error) {
        console.error('Error saving file:', error);
        // Fallback to download method if File System Access API is not supported
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'recording.webm';
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={startRecording}
        disabled={recording}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
      >
        {recording ? 'Recording...' : 'Start Recording'}
      </button>
      <button
        onClick={saveRecording}
        disabled={!recordedBlob}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Save Recording
      </button>
    </div>
  );
};

export default WebMRecorder;