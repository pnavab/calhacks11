"use client";
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface DiagramGeneratorProps {
  mermaidCode: string;
}

export default function DiagramGenerator({ mermaidCode }: DiagramGeneratorProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.render(`mermaid-${Date.now()}`, mermaidCode).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      });
    }
  }, [mermaidCode]);

  return <div ref={mermaidRef} className="mermaid"></div>;
}
