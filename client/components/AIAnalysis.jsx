import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BrainCircuit,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AnalysisDisplay = ({ analysis }) => {
  const [expanded, setExpanded] = useState({});
  const [parsedData, setParsedData] = useState({
    summary: "",
    themes: [],
    talkingPoints: [],
    sentiment: [],
    patterns: [],
    recommendations: [],
  });

  useEffect(() => {
    if (analysis) {
      // Parse the analysis text
      const parseAnalysis = (text) => {
        const sections = {
          summary: "",
          themes: [],
          talkingPoints: [],
          sentiment: [],
          patterns: [],
          recommendations: [],
        };

        // Extract summary (all text before first numbered list)
        const summaryMatch = text.match(/^(.*?)(?=\d\.)/s);
        if (summaryMatch) {
          sections.summary = summaryMatch[0].trim();
        }

        // Extract themes
        const themesMatch = text.match(
          /(?:main themes and narratives:)(.*?)(?=\*\*Key talking points)/s
        );
        if (themesMatch) {
          sections.themes = extractNumberedPoints(themesMatch[1]);
        }

        // Extract talking points
        const talkingPointsMatch = text.match(
          /(?:Key talking points:)(.*?)(?=\*\*Overall sentiment)/s
        );
        if (talkingPointsMatch) {
          sections.talkingPoints = extractNumberedPoints(talkingPointsMatch[1]);
        }

        // Extract sentiment
        const sentimentMatch = text.match(
          /(?:Overall sentiment and emotional tone:)(.*?)(?=\*\*Notable patterns)/s
        );
        if (sentimentMatch) {
          sections.sentiment = extractNumberedPoints(sentimentMatch[1]);
        }

        // Extract patterns
        const patternsMatch = text.match(
          /(?:Notable patterns or outliers:)(.*?)(?=\*\*Recommendations)/s
        );
        if (patternsMatch) {
          sections.patterns = extractNumberedPoints(patternsMatch[1]);
        }

        // Extract recommendations
        const recommendationsMatch = text.match(
          /(?:Recommendations for further analysis:)(.*?)(?=By conducting|$)/s
        );
        if (recommendationsMatch) {
          sections.recommendations = extractNumberedPoints(
            recommendationsMatch[1]
          );
        }

        return sections;
      };

      // Helper function to extract numbered points
      const extractNumberedPoints = (text) => {
        if (!text) return [];
        const points = [];
        const pointMatches = text.matchAll(/(\d+\.)\s*(.*?)(?=\d+\.|$)/gs);

        for (const match of pointMatches) {
          if (match[2]) {
            points.push(match[2].trim());
          }
        }

        return points;
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
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`border border-${color}-200 dark:border-${color}-700 rounded-lg overflow-hidden`}
          >
            <div
              className={`p-3 bg-${color}-50 dark:bg-${color}-900/20 cursor-pointer`}
              onClick={() => toggleSection(`${expandPrefix}-${index}`)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {React.cloneElement(icon, {
                    className: `h-4 w-4 text-${color}-600 dark:text-${color}-400`,
                  })}
                  <h4
                    className={`font-medium text-${color}-900 dark:text-${color}-300 text-sm`}
                  >
                    {title} {index + 1}
                  </h4>
                </div>
                {expanded[`${expandPrefix}-${index}`] ? (
                  <ChevronUp
                    className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`}
                  />
                ) : (
                  <ChevronDown
                    className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`}
                  />
                )}
              </div>
            </div>
            {expanded[`${expandPrefix}-${index}`] && (
              <div className="p-3 bg-white dark:bg-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {item}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-500" />
          AI-Generated Analysis
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid grid-cols-6">
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
          <TabsTrigger value="patterns" className="text-xs">
            Patterns
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs">
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="pt-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-medium text-indigo-900 dark:text-indigo-300">
                  Analysis Summary
                </h4>
                <p className="mt-2 text-indigo-800 dark:text-indigo-200 text-sm leading-relaxed">
                  {parsedData.summary}
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
            title="Sentiment"
            items={parsedData.sentiment}
            icon={<TrendingUp />}
            color="emerald"
            expandPrefix="sentiment"
          />
        </TabsContent>

        <TabsContent value="patterns" className="pt-4">
          <SectionCard
            title="Pattern"
            items={parsedData.patterns}
            icon={<TrendingUp />}
            color="purple"
            expandPrefix="pattern"
          />
        </TabsContent>

        <TabsContent value="recommendations" className="pt-4">
          <SectionCard
            title="Recommendation"
            items={parsedData.recommendations}
            icon={<AlertTriangle />}
            color="red"
            expandPrefix="recommendation"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisDisplay;
