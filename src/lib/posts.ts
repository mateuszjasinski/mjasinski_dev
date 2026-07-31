/** Normalize a tag label into a URL-safe slug (e.g. "System design" → "system-design"). */
export function tagSlug(tag: string): string {
	return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Estimate reading time in whole minutes from raw markdown (~200 wpm). */
export function readingTimeMinutes(body: string | undefined): number {
	const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

/** Build a plain-text excerpt from raw markdown, stripped of syntax. */
export function excerpt(body: string | undefined, maxLen = 160): string {
	const text = (body ?? "")
		.replace(/```[\s\S]*?```/g, " ") // fenced code blocks
		.replace(/`[^`]*`/g, " ") // inline code
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> text
		.replace(/^#{1,6}\s+/gm, "") // headings
		.replace(/^[>\-*+]\s+/gm, "") // blockquotes / list markers
		.replace(/[*_~]/g, "") // emphasis marks
		.replace(/<[^>]+>/g, " ") // html tags
		.replace(/\s+/g, " ")
		.trim();

	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLen).trim() + "…";
}

/** Resolve the card description: frontmatter first, then a body excerpt. */
export function cardDescription(
	description: string | undefined,
	body: string | undefined,
	maxLen = 160,
): string {
	const trimmed = (description ?? "").trim();
	return trimmed.length > 0 ? trimmed : excerpt(body, maxLen);
}
