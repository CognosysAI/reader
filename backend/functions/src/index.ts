// index.ts
import 'reflect-metadata';
import { initializeApp } from 'firebase-admin/app';
import * as functions from 'firebase-functions';
initializeApp();

import { CrawlerHost } from './cloud-functions/crawler';
import { PuppeteerControl } from './services/puppeteer';

const puppeteerControl = new PuppeteerControl();
const crawlerHost = new CrawlerHost(puppeteerControl);

export const crawl = functions.runWith({ memory: '4GB', timeoutSeconds: 540 }).https.onRequest(async (req, res) => {
    try {
        const url = req.query.url as string;
        if (!url) {
            res.status(400).send('Missing URL parameter');
            return;
        }

        const result = await crawlerHost.crawl(url);
        res.status(200).json(result);
    } catch (error) {
        console.error('Crawl Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});
