"use client";
import React, { useState, useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function DiagramGenerator() {
  const [note, setNote] = useState("");
  const [mermaidCode, setMermaidCode] = useState("");
  const [loading, setLoading] = useState(false);

  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
  }, []);

  useEffect(() => {
    if (mermaidCode && mermaidRef.current) {
      mermaid.render("mermaid-diagram", mermaidCode).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      });
    }
  }, [mermaidCode]);

  const generateDiagram = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await response.json();
      if (data.mermaidCode) {
        setMermaidCode(data.mermaidCode);
      } else {
        console.error("Failed to generate diagram");
      }
    } catch (error) {
      console.error("Error generating diagram:", error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Diagram Generator</h1>
      <textarea
        className="w-full p-2 border rounded"
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Enter your notes here..."
      />
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={generateDiagram}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Diagram"}
      </button>
      {mermaidCode && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Generated Diagram:</h2>
          <div ref={mermaidRef}></div>
        </div>
      )}
    </div>
  );
}
