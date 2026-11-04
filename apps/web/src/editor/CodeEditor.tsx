import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { DRONE_API_SPEC } from '@autofarm/simulation';

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

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Python autocomplete for Farm Drone API
    monaco.languages.registerCompletionItemProvider('python', {
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
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: {
            value: `**${spec.name}** (${spec.category}) - ${spec.tickCost} ticks\n\n${spec.description}\n\n\`\`\`python\n${spec.example}\n\`\`\``,
          },
          insertText: spec.params.length > 0 ? `${spec.name}($0)` : `${spec.name}()`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
    const monaco = monacoRef.current;

    const newDecorations: any[] = [];
    if (activeLine !== null) {
      newDecorations.push({
        range: new monaco.Range(activeLine, 1, activeLine, 1),
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
