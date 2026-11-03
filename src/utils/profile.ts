
export const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "This change could not be completed. Please try again.";

export const initials = (name: string) =>
  Array.from(name.trim())[0]?.toUpperCase() || "P";
