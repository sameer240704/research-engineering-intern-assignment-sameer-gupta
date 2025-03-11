import { useState } from "react";
import { Button } from "./ui/button";

const AIAnalysis = ({ analysis }) => {
  const [expanded, setExpanded] = useState(false);

  const isPlaceholder = analysis.includes("currently disabled");

  const renderAnalysis = () => {
    if (isPlaceholder) {
      return (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">
            AI Analysis Feature
          </h3>
          <p className="text-blue-700">{analysis}</p>
          <div className="mt-4">
            <code className="bg-blue-100 p-2 rounded text-sm block overflow-x-auto whitespace-pre"></code>
          </div>
        </div>
      );
    }

    const shortenedContent =
      analysis.length > 300 ? analysis.substring(0, 300) + "..." : analysis;

    return (
      <div className="prose max-w-none">
        {expanded ? analysis : shortenedContent}
        {analysis.length > 300 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="mt-2"
          >
            {expanded ? "Show Less" : "Read More"}
          </Button>
        )}
      </div>
    );
  };

  return <div className="space-y-4">{renderAnalysis()}</div>;
};

export default AIAnalysis;
