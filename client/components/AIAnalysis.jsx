import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrainCircuit,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const AIAnalysisComponent = ({ analysis }) => {
  const [expanded, setExpanded] = useState({});
  const [parsedData, setParsedData] = useState({
    summary: "",
    themes: [],
    talkingPoints: [],
    sentiment: [],
  });

  useEffect(() => {
    if (analysis) {
      const parseAnalysis = (text) => {
        const sections = {
          summary: "",
          themes: [],
          talkingPoints: [],
          sentiment: [],
        };

        const summaryMatch = text.match(/^(.*?)(?=\*\*Main Themes)/s);
        if (summaryMatch) {
          sections.summary = summaryMatch[0].trim();
        }

        const themesMatch = text.match(
          /\*\*Main Themes:\*\*(.*?)(?=\*\*Key Points)/s
        );
        if (themesMatch) {
          sections.themes = extractBulletPoints(themesMatch[1]);
        }

        const talkingPointsMatch = text.match(
          /\*\*Key Points:\*\*(.*?)(?=\*\*Overall Sentiment)/s
        );
        if (talkingPointsMatch) {
          sections.talkingPoints = extractBulletPoints(talkingPointsMatch[1]);
        }

        const sentimentMatch = text.match(
          /\*\*Overall Sentiment:\*\*(.*?)(?=\*\*Notable Patterns)/s
        );
        if (sentimentMatch) {
          sections.sentiment = extractParagraphs(sentimentMatch[1]);
        }

        const patternsMatch = text.match(
          /\*\*Notable Patterns:\*\*(.*?)(?=Overall, the)/s
        );
        if (patternsMatch) {
          sections.patterns = extractBulletPoints(patternsMatch[1]);
        }

        const conclusionMatch = text.match(/Overall, the(.*?)$/s);
        if (conclusionMatch) {
          sections.recommendations = [
            `Overall, the${conclusionMatch[1].trim()}`,
          ];
        }

        return sections;
      };

      const extractBulletPoints = (text) => {
        if (!text) return [];

        let bulletMatches = text.match(/\* (.*?)(?=\n\*|\n\n|$)/gs);

        if (!bulletMatches || bulletMatches.length === 0) {
          const numberedMatches = text.match(/\d+\. (.*?)(?=\n\d+\.|\n\n|$)/gs);
          if (numberedMatches) {
            return numberedMatches.map((point) =>
              point.replace(/^\d+\.\s*/, "").trim()
            );
          }
        } else {
          return bulletMatches.map((point) =>
            point.replace(/^\*\s*/, "").trim()
          );
        }

        if (!bulletMatches || bulletMatches.length === 0) {
          return text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        }

        return [];
      };

      const extractParagraphs = (text) => {
        if (!text) return [];

        return text
          .split("\n\n")
          .map((para) => para.trim())
          .filter((para) => para.length > 0);
      };

      setParsedData(parseAnalysis(analysis));
    }
  }, [analysis]);

  const toggleSection = (section) => {
    setExpanded({
      ...expanded,
      [section]: !expanded[section],
    });
  };

  const SectionCard = ({ title, items, icon, color, expandPrefix }) => {
    const getColorClass = (baseColor) => {
      const colorMap = {
        blue: {
          border: "border-blue-200 dark:border-blue-700",
          bg: "bg-blue-50 dark:bg-blue-900/20",
          text: "text-blue-600 dark:text-blue-400",
          title: "text-blue-900 dark:text-blue-300",
        },
        amber: {
          border: "border-amber-200 dark:border-amber-700",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          text: "text-amber-600 dark:text-amber-400",
          title: "text-amber-900 dark:text-amber-300",
        },
        emerald: {
          border: "border-emerald-200 dark:border-emerald-700",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
          text: "text-emerald-600 dark:text-emerald-400",
          title: "text-emerald-900 dark:text-emerald-300",
        },
        purple: {
          border: "border-purple-200 dark:border-purple-700",
          bg: "bg-purple-50 dark:bg-purple-900/20",
          text: "text-purple-600 dark:text-purple-400",
          title: "text-purple-900 dark:text-purple-300",
        },
        red: {
          border: "border-red-200 dark:border-red-700",
          bg: "bg-red-50 dark:bg-red-900/20",
          text: "text-red-600 dark:text-red-400",
          title: "text-red-900 dark:text-red-300",
        },
      };

      return colorMap[baseColor] || colorMap.blue;
    };

    const colorClasses = getColorClass(color);

    return (
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className={`border ${colorClasses.border} rounded-lg p-4`}>
            <p className="text-slate-500 dark:text-slate-400 text-sm italic text-center">
              No {title.toLowerCase()} data available
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className={`border ${colorClasses.border} rounded-lg overflow-hidden shadow-sm`}
            >
              <div
                className={`p-3 ${colorClasses.bg} cursor-pointer`}
                onClick={() => toggleSection(`${expandPrefix}-${index}`)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {React.cloneElement(icon, {
                      className: `h-4 w-4 ${colorClasses.text}`,
                    })}
                    <h4 className={`font-medium ${colorClasses.title} text-sm`}>
                      {title} {items.length > 1 ? index + 1 : ""}
                    </h4>
                  </div>
                  {expanded[`${expandPrefix}-${index}`] ? (
                    <ChevronUp className={`h-4 w-4 ${colorClasses.text}`} />
                  ) : (
                    <ChevronDown className={`h-4 w-4 ${colorClasses.text}`} />
                  )}
                </div>
              </div>
              {expanded[`${expandPrefix}-${index}`] && (
                <div className="p-3 bg-white dark:bg-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="summary" className="text-xs">
            Summary
          </TabsTrigger>
          <TabsTrigger value="themes" className="text-xs">
            Themes
          </TabsTrigger>
          <TabsTrigger value="talking-points" className="text-xs">
            Key Points
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="text-xs">
            Sentiment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="pt-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-lg p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-medium text-indigo-900 dark:text-indigo-300">
                  Analysis Summary
                </h4>
                <p className="mt-2 text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed whitespace-pre-line">
                  {analysis || "No summary available."}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="themes" className="pt-4">
          <SectionCard
            title="Theme"
            items={parsedData.themes}
            icon={<MessageSquare />}
            color="blue"
            expandPrefix="theme"
          />
        </TabsContent>

        <TabsContent value="talking-points" className="pt-4">
          <SectionCard
            title="Key Point"
            items={parsedData.talkingPoints}
            icon={<Lightbulb />}
            color="amber"
            expandPrefix="point"
          />
        </TabsContent>

        <TabsContent value="sentiment" className="pt-4">
          <SectionCard
            title="Sentiment Analysis"
            items={parsedData.sentiment}
            icon={<TrendingUp />}
            color="emerald"
            expandPrefix="sentiment"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAnalysisComponent;
