// crawler.ts
import { singleton } from 'tsyringe';
import { PageSnapshot, PuppeteerControl } from '../services/puppeteer';
import normalizeUrl from '@esm2cjs/normalize-url';

@singleton()
export class CrawlerHost {
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
            return formatted;
        }

        if (!lastScrapped) {
            throw new Error(`No content available for URL ${urlToCrawl}`);
        }
        return this.formatSnapshot(lastScrapped);
    }

    formatSnapshot(snapshot: PageSnapshot) {
        const formatted = {
            title: (snapshot.parsed?.title || snapshot.title || '').trim(),
            url: snapshot.href?.trim(),
            content: snapshot.text?.trim(),
        };
        return formatted;
    }
}
