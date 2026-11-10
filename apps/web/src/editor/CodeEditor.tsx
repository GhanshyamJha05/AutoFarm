import React, { useRef, useEffect } from 'react';
import Editor, { Monaco, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { DRONE_API_SPEC } from '@autofarm/simulation';

// Configure Monaco loader to use the locally bundled monaco-editor package rather than fetching from remote jsdelivr CDN
loader.config({ monaco });

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  activeLine: number | null;
  errorMessage: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  activeLine,
  errorMessage,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monacoInstance: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Register Python autocomplete for Farm Drone API
    monacoInstance.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = DRONE_API_SPEC.map((spec) => ({
          label: spec.name,
          kind: monacoInstance.languages.CompletionItemKind.Function,
          documentation: {
            value: `**${spec.name}** (${spec.category}) - ${spec.tickCost} ticks\n\n${spec.description}\n\n\`\`\`python\n${spec.example}\n\`\`\``,
          },
          insertText: spec.params.length > 0 ? `${spec.name}($0)` : `${spec.name}()`,
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));

        return { suggestions };
      },
    });
  };

  // Update line highlight decoration when activeLine changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;

    const newDecorations: any[] = [];
    if (activeLine !== null) {
      newDecorations.push({
        range: new monacoInstance.Range(activeLine, 1, activeLine, 1),
        options: {
          isWholeLine: true,
          className: 'active-execution-line',
          glyphMarginClassName: 'active-execution-glyph',
        },
      });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [activeLine]);

  return (
    <div className="w-full h-full relative border border-[var(--color-border)] rounded-lg overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={code}
        loading={
          <div className="flex flex-col items-center justify-center h-full text-emerald-400 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Initializing Drone Core...</span>
          </div>
        }
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Cascadia Code, Consolas, monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
        }}
      />
    </div>
  );
};
