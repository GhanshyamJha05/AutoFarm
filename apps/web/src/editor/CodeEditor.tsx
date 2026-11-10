import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder, Transaction } from '@codemirror/state';
import { DRONE_API_SPEC } from '@autofarm/simulation';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  activeLine: number | null;
  errorMessage: string | null;
}

// Effect and Field for active line highlighting during stepping/execution
const setActiveLineEffect = StateEffect.define<number | null>();

const activeLineField = StateField.define<DecorationSet>({
  create(): DecorationSet {
    return Decoration.none;
  },
  update(decorations: DecorationSet, tr: Transaction): DecorationSet {
    for (const e of tr.effects) {
      if (e.is(setActiveLineEffect)) {
        if (e.value === null) return Decoration.none;
        const lineNum = e.value;
        const builder = new RangeSetBuilder<Decoration>();
        if (lineNum > 0 && lineNum <= tr.state.doc.lines) {
          const line = tr.state.doc.line(lineNum);
          builder.add(
            line.from,
            line.from,
            Decoration.line({
              attributes: { style: 'background-color: rgba(16, 185, 129, 0.25); border-left: 3px solid #10b981;' },
            })
          );
        }
        return builder.finish();
      }
    }
    return decorations.map(tr.changes);
  },
  provide: (f: StateField<DecorationSet>) => EditorView.decorations.from(f),
});

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  activeLine,
  errorMessage,
}) => {
  // Autocomplete provider for AutoFarm Drone API
  const droneCompletion = useMemo(() => {
    return autocompletion({
      override: [
        (context: CompletionContext) => {
          const word = context.matchBefore(/\w*/);
          if (!word || (word.from === word.to && !context.explicit)) return null;

          return {
            from: word.from,
            options: DRONE_API_SPEC.map((spec) => ({
              label: spec.name,
              type: 'function',
              detail: `(${spec.tickCost} ticks) ${spec.category}`,
              info: `${spec.description}\n\nExample:\n${spec.example}`,
              apply: spec.params.length > 0 ? `${spec.name}()` : `${spec.name}()`,
            })),
          };
        },
      ],
    });
  }, []);

  const extensions = useMemo(() => {
    return [
      python(),
      oneDark,
      droneCompletion,
      activeLineField,
      EditorView.lineWrapping,
    ];
  }, [droneCompletion]);

  return (
    <div className="w-full h-full relative border border-[var(--color-border)] rounded-lg overflow-hidden bg-[#282c34] flex flex-col">
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={(value) => onChange(value)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          style={{ height: '100%', fontSize: '14px', fontFamily: 'Cascadia Code, Consolas, monospace' }}
        />
      </div>
    </div>
  );
};
