from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from groq import Groq
import uvicorn
import os

# Initialize the Groq client
client = Groq(
    api_key="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" ,
)

app = FastAPI()

@app.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        # Ensure an audio file is provided
        if not audio:
            raise HTTPException(status_code=400, detail="No audio file received")

        # Read the audio file content
        audio_content = await audio.read()

        # Create a transcription job with the audio file content
        transcription = client.audio.transcriptions.create(
            file=(audio.filename, audio_content),  # Pass file name and content
            model="whisper-large-v3",
            response_format="json",
            language="en",
            temperature=0.0,
        )

        # Return the transcription text
        return JSONResponse(content={"transcription": transcription.text}, status_code=200)

    except Exception as e:
        print(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000)
