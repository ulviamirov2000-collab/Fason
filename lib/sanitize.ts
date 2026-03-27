// Strip HTML tags and trim whitespace from user input before saving to DB
export const sanitize = (str: string): string => str.replace(/<[^>]*>/g, '').trim()
