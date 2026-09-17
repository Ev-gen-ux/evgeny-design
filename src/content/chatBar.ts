/** Copy for the persistent bottom ChatBar (see useChatBar) — everything else it shows is read straight off each section's own PromptSteps question, not duplicated here. */
export const chatBar = {
  /** Shown once the user reaches the very bottom of the page, replacing the last section's question. */
  closingLine: 'спасибо, беру в работу',
} as const;
