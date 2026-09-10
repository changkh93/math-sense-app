import { HighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { highlightActiveLine } from '@codemirror/view'

// Opt in from Code Studio; other Python lesson editors retain their current appearance.
export const studioSyntax = [
  syntaxHighlighting(HighlightStyle.define([
    { tag: tags.keyword, class: 'pgs-code-keyword' },
    { tag: tags.variableName, class: 'pgs-code-variable' },
    { tag: tags.propertyName, class: 'pgs-code-variable' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], class: 'pgs-code-function' },
    { tag: tags.className, class: 'pgs-code-class' },
    { tag: tags.string, class: 'pgs-code-string' },
    { tag: [tags.number, tags.bool, tags.null], class: 'pgs-code-number' },
    { tag: tags.comment, class: 'pgs-code-comment' },
    { tag: [tags.operator, tags.punctuation], class: 'pgs-code-operator' },
  ])),
  bracketMatching(), highlightActiveLine(),
]
