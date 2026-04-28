"use client";

import { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Search, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

type Labels = {
  searchTitle: string;
  areaCode: string;
  areaCodePlaceholder: string;
  search: string;
  searching: string;
  availableTitle: string;
  ownedTitle: string;
  noResults: string;
  noOwned: string;
  purchase: string;
  purchasing: string;
  assignedTo: string;
  unassigned: string;
  status: string;
  active: string;
  vapiError: string;
  capabilities: string;
  voice: string;
  sms: string;
  mms: string;
  priceUnavailable: string;
  loading: string;
  genericError: string;
  refresh: string;
  assignmentSaved: string;
};

type Capabilities = {
  voice?: boolean;
  sms?: boolean;
  mms?: boolean;
};

type AvailablePhoneNumber = {
  phone_number: string;
  friendly_name: string | null;
  locality: string | null;
  region: string | null;
  country: string;
  capabilities: Capabilities;
  monthly_cost: number | null;
  monthly_cost_currency: string | null;
};

type PhoneNumber = {
  id: string;
  provider_sid: string | null;
  vapi_phone_number_id: string | null;
  phone_number: string;
  friendly_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  is_active: boolean;
  capabilities: Capabilities;
  area_code: string | null;
  country: string;
  monthly_cost: number | null;
  monthly_cost_currency: string | null;
  provisioning_status: "active" | "vapi_error";
  provisioning_error: string | null;
};

type Agent = {
  id: string;
  name: string;
};

type Props = {
  labels: Labels;
};

function formatPrice(amount: number | null, currency: string | null, labels: Labels) {
  if (amount === null || !currency) {
    return labels.priceUnavailable;
  }
  return `${new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount)}/mo`;
}

function capabilityBadges(capabilities: Capabilities, labels: Labels) {
  const items = [
    { enabled: capabilities.voice, label: labels.voice },
    { enabled: capabilities.sms, label: labels.sms },
    { enabled: capabilities.mms, label: labels.mms },
  ];

  return items
    .filter((item) => item.enabled)
    .map((item) => (
      <Badge key={item.label} variant="secondary">
        {item.label}
      </Badge>
    ));
}

function locationLabel(number: AvailablePhoneNumber) {
  return [number.locality, number.region].filter(Boolean).join(", ");
}

export function PhoneNumbersClient({ labels }: Props) {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [available, setAvailable] = useState<AvailablePhoneNumber[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [numbers, agentRows] = await Promise.all([
        apiFetch<PhoneNumber[]>("/api/phone-numbers"),
        apiFetch<Agent[]>("/api/voice-agents"),
      ]);
      setPhoneNumbers(numbers);
      setAgents(agentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.genericError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams();
      if (areaCode.trim()) {
        params.set("area_code", areaCode.trim());
      }
      const results = await apiFetch<AvailablePhoneNumber[]>(
        `/api/phone-numbers/search?${params.toString()}`,
      );
      setAvailable(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.genericError);
      setAvailable([]);
    } finally {
      setSearching(false);
    }
  }

  async function handlePurchase(number: AvailablePhoneNumber) {
    setPurchasing(number.phone_number);
    setError(null);
    setNotice(null);
    try {
      const purchased = await apiFetch<PhoneNumber>("/api/phone-numbers/purchase", {
        method: "POST",
        body: JSON.stringify({
          phone_number: number.phone_number,
          friendly_name: number.friendly_name,
        }),
      });
      setPhoneNumbers((current) => [purchased, ...current]);
      setAvailable((current) =>
        current.filter((item) => item.phone_number !== number.phone_number),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.genericError);
    } finally {
      setPurchasing(null);
    }
  }

  async function handleAssignment(phoneNumberId: string, agentId: string) {
    setAssigning(phoneNumberId);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiFetch<PhoneNumber>(
        `/api/phone-numbers/${phoneNumberId}/assignment`,
        {
          method: "PATCH",
          body: JSON.stringify({
            agent_id: agentId === "unassigned" ? null : agentId,
          }),
        },
      );
      setPhoneNumbers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(labels.assignmentSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.genericError);
    } finally {
      setAssigning(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">{labels.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.searchTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearch}>
            <div className="grid gap-2">
              <Label htmlFor="area-code">{labels.areaCode}</Label>
              <Input
                id="area-code"
                inputMode="numeric"
                maxLength={3}
                pattern="[0-9]{3}"
                placeholder={labels.areaCodePlaceholder}
                value={areaCode}
                onChange={(event) => setAreaCode(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button type="submit" disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              {searching ? labels.searching : labels.search}
            </Button>
            <Button type="button" variant="outline" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.refresh}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.availableTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noResults}</p>
          ) : (
            available.map((number) => (
              <div
                key={number.phone_number}
                className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="font-medium">{number.phone_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {locationLabel(number) || number.country}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {capabilityBadges(number.capabilities, labels)}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="text-sm text-muted-foreground">
                    {formatPrice(number.monthly_cost, number.monthly_cost_currency, labels)}
                  </div>
                  <Button
                    onClick={() => void handlePurchase(number)}
                    disabled={purchasing === number.phone_number}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {purchasing === number.phone_number ? labels.purchasing : labels.purchase}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{labels.ownedTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {phoneNumbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noOwned}</p>
          ) : (
            phoneNumbers.map((number) => (
              <div
                key={number.id}
                className="grid gap-4 rounded-md border p-4 lg:grid-cols-[1.2fr_1fr_auto]"
              >
                <div className="space-y-2">
                  <div className="font-medium">{number.phone_number}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        number.provisioning_status === "active" ? "default" : "destructive"
                      }
                    >
                      {number.provisioning_status === "active"
                        ? labels.active
                        : labels.vapiError}
                    </Badge>
                    {capabilityBadges(number.capabilities, labels)}
                  </div>
                  {number.provisioning_error ? (
                    <p className="text-sm text-destructive">{number.provisioning_error}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>{labels.assignedTo}</Label>
                  <Select
                    value={number.agent_id ?? "unassigned"}
                    onValueChange={(value) => void handleAssignment(number.id, value)}
                    disabled={assigning === number.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{labels.unassigned}</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground lg:text-right">
                  {formatPrice(number.monthly_cost, number.monthly_cost_currency, labels)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
