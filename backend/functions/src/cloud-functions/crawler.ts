// crawler.ts
import { singleton } from 'tsyringe';
import { PageSnapshot, PuppeteerControl } from '../services/puppeteer';
import normalizeUrl from '@esm2cjs/normalize-url';
import TurnDownService from 'turndown';

function tidyMarkdown(markdown: string): string {
    // Step 1: Handle complex broken links with text and optional images spread across multiple lines
    let normalizedMarkdown = markdown.replace(/\[\s*([^]+?)\s*\]\s*\(\s*([^)]+)\s*\)/g, (match, text, url) => {
        // Remove internal new lines and excessive spaces within the text
        text = text.replace(/\s+/g, ' ').trim();
        url = url.replace(/\s+/g, '').trim();
        return `[${text}](${url})`;
    });

    normalizedMarkdown = normalizedMarkdown.replace(
        /\[\s*([^!]*?)\s*\n*(?:!\[([^\]]*)\]\((.*?)\))?\s*\n*\]\s*\(\s*([^)]+)\s*\)/g,
        (match, text, alt, imgUrl, linkUrl) => {
            // Normalize by removing excessive spaces and new lines
            text = text.replace(/\s+/g, ' ').trim();
            alt = alt ? alt.replace(/\s+/g, ' ').trim() : '';
            imgUrl = imgUrl ? imgUrl.replace(/\s+/g, '').trim() : '';
            linkUrl = linkUrl.replace(/\s+/g, '').trim();
            if (imgUrl) {
                return `[${text} ![${alt}](${imgUrl})](${linkUrl})`;
            } else {
                return `[${text}](${linkUrl})`;
            }
        }
    );

    // Step 2: Normalize regular links that may be broken across lines
    normalizedMarkdown = normalizedMarkdown.replace(/\[\s*([^\]]+)\]\s*\(\s*([^)]+)\)/g, (match, text, url) => {
        text = text.replace(/\s+/g, ' ').trim();
        url = url.replace(/\s+/g, '').trim();
        return `[${text}](${url})`;
    });

    // Step 3: Replace more than two consecutive empty lines with exactly two empty lines
    normalizedMarkdown = normalizedMarkdown.replace(/\n{3,}/g, '\n\n');

    // Step 4: Remove leading spaces from each line
    normalizedMarkdown = normalizedMarkdown.replace(/^[ \t]+/gm, '');

    return normalizedMarkdown.trim();
}

@singleton()
export class CrawlerHost {
    turnDownService = new TurnDownService().use(require('turndown-plugin-gfm').gfm);
    constructor(protected puppeteerControl: PuppeteerControl) {}

    async crawl(url: string) {
        let urlToCrawl;
        try {
            urlToCrawl = new URL(normalizeUrl(url.trim()));
        } catch (err) {
            throw new Error(`Invalid URL: ${err}`);
        }

        let lastScrapped;
        for await (const scrapped of this.puppeteerControl.scrap(urlToCrawl.toString())) {
            lastScrapped = scrapped;
            if (!scrapped?.parsed?.content || !scrapped.title?.trim()) {
                continue;
            }
            const formatted = this.formatSnapshot(scrapped);
            return formatted.toString();
        }

        if (!lastScrapped) {
            throw new Error(`No content available for URL ${urlToCrawl}`);
        }
        return this.formatSnapshot(lastScrapped);
    }

    formatSnapshot(snapshot: PageSnapshot) {
        const toBeTurnedToMd = snapshot.parsed?.content;
        const turnedDown = toBeTurnedToMd ? this.turnDownService.turndown(toBeTurnedToMd).trim() : '';

        const contentText =
            turnedDown && !(turnedDown.startsWith('<') && turnedDown.endsWith('>'))
                ? turnedDown
                : snapshot.text?.trim();

        const cleanText = tidyMarkdown(contentText).trim();

        const formatted = {
            title: (snapshot.parsed?.title || snapshot.title || '').trim(),
            url: snapshot.href?.trim(),
            content: cleanText,

            toString() {
                return `Title: ${this.title}

URL Source: ${this.url}

Markdown Content:
${this.content}
`;
            },
        };

        return formatted.toString();
    }
}
