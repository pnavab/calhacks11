from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import chromadb
from uuid import uuid4
from sentence_transformers import SentenceTransformer
embedding_model = SentenceTransformer('all-mpnet-base-v2')
print("embedding model loaded", embedding_model)

app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_client = chromadb.PersistentClient(
    path="./chroma",  # Directory for storing the database
)
# chroma_client.delete_collection("collection")
collection = chroma_client.get_or_create_collection("collection")

def upload_documents(dict_list):
    ids = [str(uuid4()) for _ in dict_list]
    documents = [d['content'] for d in dict_list]
    metadatas = [{'title': d['title']} for d in dict_list]
    embeddings = embedding_model.encode(documents)

    collection.add(
        documents=documents,
        ids=ids,
        metadatas=metadatas,
        embeddings=embeddings.tolist(),
    )

@app.post("/upload")
async def process_notes(request: Request):
    try:
        # Parse JSON body directly from the request
        notes = await request.json()
        print("received notes:", notes)
        # Ensure notes is a list
        if not isinstance(notes, list):
            raise HTTPException(status_code=400, detail="Invalid format: Expected a list of notes.")

        upload_documents(notes)

        return {"status": "success", "message": "Notes processed and stored successfully."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/notes")
async def get_notes():
    # Get all documents from the collection
    documents = collection.get()
    print("retrieved notes:", documents)
    return documents

@app.post("/search")
async def search_notes(request: Request):
    try:
        # Parse JSON body directly from the request
        query = await request.json()
        print("received query:", query)

        query_embedding = embedding_model.encode([query])
        results = collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=5
        )
        return results
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("server:app", port=8000, reload=True)