import React from 'react';
import { Button } from "@/components/ui/button";

interface Diagram {
  id: string;
  code: string;
  text: string;
}

interface DiagramListProps {
  diagrams: Diagram[];
  onSelectDiagram: (diagram: Diagram) => void;
  currentDiagramId: string | null;
}

export function DiagramList({ diagrams, onSelectDiagram, currentDiagramId }: DiagramListProps) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Generated Diagrams</h3>
      {diagrams.map((diagram, index) => (
        <Button
          key={diagram.id}
          onClick={() => onSelectDiagram(diagram)}
          className={`mr-2 mb-2 ${currentDiagramId === diagram.id ? 'bg-blue-500' : 'bg-gray-200'}`}
        >
          Diagram {index + 1}
        </Button>
      ))}
    </div>
  );
}
