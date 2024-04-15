// crawler.ts
import { singleton } from 'tsyringe';
import { RPCReflection } from 'civkit';
import { PageSnapshot, PuppeteerControl } from '../services/puppeteer';
import { Request, Response } from 'express';
import normalizeUrl from '@esm2cjs/normalize-url';

@singleton()
export class CrawlerHost {
    constructor(protected puppeteerControl: PuppeteerControl) {}

    async crawl(
        rpcReflect: RPCReflection,
        ctx: {
            req: Request;
            res: Response;
        }
    ) {
        const noSlashURL = ctx.req.url.slice(1);
        let urlToCrawl;
        try {
            urlToCrawl = new URL(normalizeUrl(noSlashURL.trim()));
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
