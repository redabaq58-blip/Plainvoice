import { getTranslations } from "next-intl/server";
import { PhoneNumbersClient } from "@/components/phone-numbers/phone-numbers-client";

export default async function PhoneNumbersPage() {
  const t = await getTranslations("phoneNumbers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PhoneNumbersClient
        labels={{
          searchTitle: t("searchTitle"),
          areaCode: t("areaCode"),
          areaCodePlaceholder: t("areaCodePlaceholder"),
          search: t("search"),
          searching: t("searching"),
          availableTitle: t("availableTitle"),
          ownedTitle: t("ownedTitle"),
          noResults: t("noResults"),
          noOwned: t("noOwned"),
          purchase: t("purchase"),
          purchasing: t("purchasing"),
          assignedTo: t("assignedTo"),
          unassigned: t("unassigned"),
          status: t("status"),
          active: t("active"),
          vapiError: t("vapiError"),
          capabilities: t("capabilities"),
          voice: t("voice"),
          sms: t("sms"),
          mms: t("mms"),
          priceUnavailable: t("priceUnavailable"),
          loading: t("loading"),
          genericError: t("genericError"),
          refresh: t("refresh"),
          assignmentSaved: t("assignmentSaved"),
        }}
      />
    </div>
  );
}
