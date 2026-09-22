import { t } from '../../../i18n';

/** Names `entryHostMissing` can report, worded as the fields above word them. */
export const entryFieldLabel = (field: string): string =>
    ({
        "shared tag": t("Shared tag for this location"),
        remark: t("Remark"),
        address: t("Address"),
        port: t("Port"),
        inbound: t("Inbound"),
        "saved template": t("Saved template"),
    })[field] ?? field;
