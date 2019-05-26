import Db from '../Db';
import { uploadTransactions } from '../ynab';
import { PersistedTransaction } from '../types';
import _ from 'lodash';

async function uploadToYnab() {
    const db = new Db();
    const configurations = await db.getConfigurations();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const transactions = await db.getTransactions(startDate);

    for (const configuration of configurations) {
        const accountBatches = _.groupBy(
            transactions.filter(tx => !!configuration.getYnabUploadTarget(tx.account)),
            (tx: PersistedTransaction) => {
                let ynabUploadTarget = configuration.getYnabUploadTarget(tx.account);
                return ynabUploadTarget && [ynabUploadTarget.budgetId, ynabUploadTarget.accountId];
            }
        );
        for (const ynabConfiguration in accountBatches) {
            if (!ynabConfiguration) {
                continue;
            }

            const newTransactions = accountBatches[ynabConfiguration];
            const configParts = ynabConfiguration.split(',');
            await uploadTransactions(configuration.ynabApiKey, configParts[0], configParts[1], newTransactions);
        }
    }
}

uploadToYnab().catch(err => console.error(err));
