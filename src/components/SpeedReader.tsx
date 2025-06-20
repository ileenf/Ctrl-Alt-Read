import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, BookOpen, Clock, Target } from 'lucide-react';

interface WordData {
  word: string;
  focusIndex: number;
  hasPunctuation: boolean;
}

const SpeedReader: React.FC = () => {
  const [text, setText] = useState('');
  const [words, setWords] = useState<WordData[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wpm, setWpm] = useState(() => {
    const saved = localStorage.getItem('speedReaderWPM');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate optimal focus point for each word
  const calculateFocusPoint = (word: string): number => {
    const length = word.length;
    if (length <= 1) return 0;
    if (length <= 5) return 1;
    if (length <= 9) return 2;
    if (length <= 13) return 3;
    return 4;
  };

  // Check if word has sentence-ending punctuation
  const hasSentenceEndingPunctuation = (word: string): boolean => {
    return /[.!?,]$/.test(word);
  };

  // Parse text into words with focus points and punctuation detection
  const parseText = useCallback((inputText: string) => {
    const cleanText = inputText.trim().replace(/\s+/g, ' ');
    const wordArray = cleanText.split(' ').filter(word => word.length > 0);
    
    const wordsWithFocus = wordArray.map(word => ({
      word: word,
      focusIndex: calculateFocusPoint(word),
      hasPunctuation: hasSentenceEndingPunctuation(word)
    }));
    
    setWords(wordsWithFocus);
    setCurrentWordIndex(0);
    setIsPaused(false);
  }, []);

  // Clear any existing timeout
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Advance to next word
  const advanceToNextWord = useCallback(() => {
    setCurrentWordIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= words.length) {
        // Reached the end
        setIsPlaying(false);
        setIsPaused(false);
        return words.length - 1;
      }
      return nextIndex;
    });
  }, [words.length]);

  // Start the reading process
  const startReading = useCallback(() => {
    if (!isPlaying || words.length === 0 || currentWordIndex >= words.length - 1) {
      return;
    }

    clearCurrentTimeout();

    const currentWord = words[currentWordIndex];
    const baseInterval = 60000 / wpm; // milliseconds per word
    const interval = currentWord?.hasPunctuation ? baseInterval * 2 : baseInterval;

    timeoutRef.current = setTimeout(() => {
      advanceToNextWord();
    }, interval);
  }, [isPlaying, words, currentWordIndex, wpm, clearCurrentTimeout, advanceToNextWord]);

  // Effect to handle reading progression
  useEffect(() => {
    if (isPlaying && words.length > 0 && currentWordIndex < words.length - 1) {
      startReading();
    }

    return () => {
      clearCurrentTimeout();
    };
  }, [isPlaying, currentWordIndex, startReading, clearCurrentTimeout]);

  // Toggle play/pause
  const toggleReading = () => {
    if (words.length === 0) return;
    
    if (isPlaying) {
      // Pause
      clearCurrentTimeout();
      setIsPlaying(false);
      setIsPaused(true);
    } else {
      // Start or Resume
      if (currentWordIndex >= words.length - 1) {
        // If at the end, restart from beginning
        setCurrentWordIndex(0);
      }
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  // Reset reading
  const resetReading = () => {
    clearCurrentTimeout();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(0);
  };

  // Handle WPM change
  const handleWpmChange = (newWpm: number) => {
    setWpm(newWpm);
    localStorage.setItem('speedReaderWPM', newWpm.toString());
  };

  // Start reading handler - now auto-starts reading
  const handleStartReading = () => {
    if (text.trim()) {
      parseText(text);
      // Auto-start reading after parsing
      setTimeout(() => {
        setIsPlaying(true);
      }, 100); // Small delay to ensure state is updated
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentTimeout();
    };
  }, [clearCurrentTimeout]);

  // Calculate reading stats
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedTime = wordCount > 0 ? Math.ceil(wordCount / wpm) : 0;
  // Fix progress calculation to show 100% when on last word
  const progress = words.length > 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  // Render current word with focus point
  const renderCurrentWord = () => {
    if (words.length === 0 || currentWordIndex >= words.length) return null;
    
    const currentWord = words[currentWordIndex];
    const { word, focusIndex } = currentWord;
    
    return (
      <div className="text-center transition-all duration-200 ease-in-out">
        <div className="text-6xl md:text-8xl font-bold text-gray-800 font-mono tracking-wider">
          {word.split('').map((char, index) => (
            <span
              key={index}
              className={
                index === focusIndex
                  ? 'text-blue-600 bg-blue-100 px-1 rounded transition-all duration-150'
                  : 'text-gray-800 transition-all duration-150'
              }
            >
              {char}
            </span>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500 transition-opacity duration-200">
          Word {currentWordIndex + 1} of {words.length}
        </div>
      </div>
    );
  };

  // Get button text based on state
  const getPlayButtonText = () => {
    if (isPlaying) return 'Pause';
    if (isPaused) return 'Resume';
    return 'Start';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Target className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              Ctrl Alt Read
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            The first minimalist speed reading tool to help you read faster and stay focused — one word at a time.
          </p>
        </div>

        {words.length === 0 ? (
          /* Input Section */
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
            <div className="mb-6">
              <label htmlFor="text-input" className="block text-lg font-semibold text-gray-700 mb-3">
                Enter your text to read
              </label>
              <textarea
                ref={textareaRef}
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type the text you want to speed read..."
                className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none text-gray-700"
              />
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{wordCount} words</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>~{estimatedTime} min at {wpm} WPM</span>
              </div>
            </div>

            {/* Speed Control */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Reading Speed: {wpm} WPM
                </label>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="25"
                value={wpm}
                onChange={(e) => handleWpmChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100 WPM</span>
                <span>1000 WPM</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartReading}
              disabled={!text.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:hover:scale-100"
            >
              Start Speed Reading
            </button>
          </div>
        ) : (
          /* Reading Section */
          <div className="space-y-8">
            {/* Progress Bar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Word Display */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-12 min-h-[300px] flex items-center justify-center">
              {renderCurrentWord()}
            </div>

            {/* Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={toggleReading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    isPlaying
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  }`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span>{getPlayButtonText()}</span>
                </button>
                
                <button
                  onClick={resetReading}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Speed Control */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Speed: {wpm} WPM
                  </label>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="25"
                  value={wpm}
                  onChange={(e) => handleWpmChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Back to Input */}
              <button
                onClick={() => {
                  resetReading();
                  setWords([]);
                }}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold py-3 px-6 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:scale-[1.02]"
              >
                New Text
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeedReader;