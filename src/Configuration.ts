import {FinanciaAccountConfiguration, YnabBudget, YnabUploadTarget} from "./types";

export class Configuration {
    constructor(
        public ynabApiKey: string,
        public ynabBudgets: YnabBudget[],
        public accountsConfig: FinanciaAccountConfiguration[]
    ) {
    }

    public getYnabUploadTarget(accountId:string):YnabUploadTarget|null{
        const accountConfiguration = this.accountsConfig.find(x => x.accounts.some(y => y === accountId));
        if (!accountConfiguration){
            return null;
        }
        const ynabConfiguration = accountConfiguration && accountConfiguration.ynab;
        if (!ynabConfiguration){
            return null;
        }

        const ynabBudget = this.ynabBudgets.find(x=>x.name === ynabConfiguration.budgetName)!;
        const ynabAccount = ynabBudget.accounts.find(x=>x.name === ynabConfiguration.accountName)!;
        return {budgetId:ynabBudget.id,accountId:ynabAccount.id};
    }
}
