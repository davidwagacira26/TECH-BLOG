import sanitizeHtml from 'sanitize-html'
import type { IOptions } from 'sanitize-html'

const defaultOptions: IOptions = {
  allowedTags: ['img', 'p', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
  allowedAttributes: {
    '*': ['class', 'style'],
    'a': ['href', 'target'],
    'img': ['src', 'alt']
  }
}

export function cleanHtml(dirty: string): string {
  return sanitizeHtml(dirty, defaultOptions)
}