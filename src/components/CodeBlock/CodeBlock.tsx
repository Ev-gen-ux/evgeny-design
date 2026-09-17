import { Highlight, themes } from 'prism-react-renderer';
import styles from './CodeBlock.module.css';

export interface CodeBlockProps {
  code: string;
  language?: string;
}

/**
 * Syntax-highlighted code snippet for the AI-PDP-DS case study. The source
 * (Case Study.dc.html) just rendered these as plain <pre> text with no
 * coloring — added properly highlighted code per user request (2026-08-02):
 * a case study about a styled-components design system reads much better
 * with its own code shown roughly the way it looked in the editor while it
 * was being built. Theme: Night Owl (prism-react-renderer's bundled preset),
 * chosen as a close, well-known match for "some colorful editor theme/plugin"
 * the user couldn't recall precisely.
 */
export function CodeBlock({ code, language = 'tsx' }: CodeBlockProps) {
  return (
    <Highlight code={code.trim()} language={language} theme={themes.nightOwl}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre data-noasm="1" className={`${styles.codeBlock} ${className}`} style={style}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
