import {createScraper} from 'israeli-bank-scrapers';
import {Account, FinanciaAccountConfiguration, PersistedTransaction, Provider, ScrapeResult} from './types';
import _ from 'lodash';
import puppeteer from 'puppeteer';
import shortid from 'shortid';
import moment from 'moment';
import logger from "./logger";
import env from './env';

function removeNonAscii(str:string){
    return str.replace(/[^\x20-\x7E]+/g, "").trim()
}

function mapTransaction(account: Account, providerName: Provider) {
    return account.txns.map(tx => {
        return {
            id: shortid.generate(),
            account: removeNonAscii(account.accountNumber),
            provider: providerName,
            chargedAmount: tx.chargedAmount,
            date: new Date(moment(tx.date).format('YYYY-MM-DD')),
            processedDate: new Date(moment(tx.processedDate).format('YYYY-MM-DD')),
            description: tx.description.trim(),
            installments: tx.installments || null,
            originalAmount: tx.originalAmount,
            originalCurrency: tx.originalCurrency,
            approvalNumber: tx.identifier || 0,
            memo: tx.memo || ''
        };
    });
}

function mapScrape(scrape: ScrapeResult, providerName: Provider): PersistedTransaction[] {
    return _.flatten(scrape.accounts.map(x => mapTransaction(x, providerName)));
}

function processResults(results: { [x: string]: ScrapeResult }): PersistedTransaction[] {
    return _.flatten(
        Object.keys(results).map(providerName => {
            const scrape = results[providerName];
            return mapScrape(scrape, providerName as Provider);
        })
    );
}

export async function runScrape(startDate: Date,...scrapers: FinanciaAccountConfiguration[]) {
    const results: { [x: string]: ScrapeResult } = {};
    const browser = await puppeteer.launch({
        args:['--no-sandbox', '--disable-setuid-sandbox'],
        headless: env.HEADLESS
    });

    for (const scraperConfig of scrapers) {
        logger.log(`Scraping ${scraperConfig.companyId}`);

        const scraper = createScraper({
            companyId: scraperConfig.companyId, // mandatory; one of 'hapoalim', 'leumi', 'discount', 'otsarHahayal', 'visaCal', 'leumiCard', 'isracard', 'amex'
            startDate,
            combineInstallments: false,
            showBrowser: true,
            verbose: false,
            browser
        });

        const scrapeResult = (await scraper.scrape(scraperConfig.credentials)) as ScrapeResult;

        if (scrapeResult.success) {
            scrapeResult.accounts.forEach(account => {
                logger.log(`found ${account.txns.length} transactions for account number ${account.accountNumber}`);
            });

            results[scraperConfig.companyId] = scrapeResult;
        } else {
            console.error(`scraping failed for the following reason: ${scrapeResult.errorType}`);
        }
    }

    return processResults(results);
}
