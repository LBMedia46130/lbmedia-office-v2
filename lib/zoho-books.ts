type ZohoTokenResponse = {
  access_token?: string;
  api_domain?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

type ZohoApiResponse<T> = {
  code: number;
  message: string;
} & T;

type ZohoPageContext = {
  page: number;
  per_page: number;
  has_more_page: boolean;
  report_name?: string;
  applied_filter?: string;
  sort_column?: string;
  sort_order?: string;
};

export type ZohoOrganization = {
  organization_id: string;
  name: string;
  currency_code?: string;
  country?: string;
  time_zone?: string;
};

export type ZohoContact = {
  contact_id: string;
  contact_name: string;
  company_name?: string;
  contact_type?: string;
  customer_sub_type?: string;
  status?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  outstanding_receivable_amount?: number;
  unused_credits_receivable_amount?: number;
  currency_code?: string;
};

export type ZohoInvoice = {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  status: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  currency_code?: string;
  reference_number?: string;
  is_emailed?: boolean;
  reminders_sent?: number;
  last_reminder_sent_date?: string;
  payment_expected_date?: string;
  last_payment_date?: string;
  created_time?: string;
  last_modified_time?: string;
};

let cachedAccessToken: {
  token: string;
  expiresAt: number;
} | null = null;

function getZohoConfig() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const organizationId = process.env.ZOHO_ORGANIZATION_ID;

  if (
    !clientId ||
    !clientSecret ||
    !refreshToken ||
    !organizationId
  ) {
    throw new Error(
      "Configuration Zoho Books incomplète. Vérifie ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN et ZOHO_ORGANIZATION_ID."
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    organizationId,
  };
}

async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAt > now + 60_000
  ) {
    return cachedAccessToken.token;
  }

  const {
    clientId,
    clientSecret,
    refreshToken,
  } = getZohoConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(
    "https://accounts.zoho.eu/oauth/v2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as ZohoTokenResponse;

  if (
    !response.ok ||
    data.error ||
    !data.access_token
  ) {
    throw new Error(
      `Impossible d'obtenir un access token Zoho : ${
        data.error ?? response.statusText
      }`
    );
  }

  const expiresIn =
    typeof data.expires_in === "number"
      ? data.expires_in
      : 3600;

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return data.access_token;
}

async function zohoBooksRequest<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<
    string,
    string | number | boolean | undefined
  >
): Promise<ZohoApiResponse<T>> {
  const { organizationId } = getZohoConfig();
  const accessToken =
    await getZohoAccessToken();

  const url = new URL(
    `https://www.zohoapis.eu/books/v3${path}`
  );

  url.searchParams.set(
    "organization_id",
    organizationId
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  }

  const headers = new Headers(options.headers);

  headers.set(
    "Authorization",
    `Zoho-oauthtoken ${accessToken}`
  );

  if (
    options.body &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data =
    (await response.json()) as ZohoApiResponse<T>;

  if (!response.ok || data.code !== 0) {
    throw new Error(
      `Erreur Zoho Books (${data.code ?? response.status}) : ${
        data.message ?? response.statusText
      }`
    );
  }

  return data;
}

export function getZohoOrganizationId() {
  return getZohoConfig().organizationId;
}

export async function getZohoOrganizations() {
  const accessToken =
    await getZohoAccessToken();

  const response = await fetch(
    "https://www.zohoapis.eu/books/v3/organizations",
    {
      headers: {
        Authorization:
          `Zoho-oauthtoken ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data =
    (await response.json()) as ZohoApiResponse<{
      organizations?: ZohoOrganization[];
    }>;

  if (!response.ok || data.code !== 0) {
    throw new Error(
      `Impossible de récupérer les organisations Zoho Books : ${
        data.message ?? response.statusText
      }`
    );
  }

  return data.organizations ?? [];
}

export async function getZohoContacts(
  page = 1,
  perPage = 200
) {
  const data = await zohoBooksRequest<{
    contacts?: ZohoContact[];
    page_context?: ZohoPageContext;
  }>(
    "/contacts",
    { method: "GET" },
    {
      page,
      per_page: perPage,
      contact_type: "customer",
    }
  );

  return {
    contacts: data.contacts ?? [],
    pageContext: data.page_context ?? null,
  };
}

export async function getZohoContact(
  contactId: string
) {
  if (!contactId) {
    throw new Error(
      "Identifiant de contact Zoho manquant."
    );
  }

  const data = await zohoBooksRequest<{
    contact?: ZohoContact;
  }>(
    `/contacts/${encodeURIComponent(contactId)}`,
    { method: "GET" }
  );

  if (!data.contact) {
    throw new Error(
      "Contact Zoho Books introuvable."
    );
  }

  return data.contact;
}

export async function getZohoInvoices(
  page = 1,
  perPage = 200
) {
  const data = await zohoBooksRequest<{
    invoices?: ZohoInvoice[];
    page_context?: ZohoPageContext;
  }>(
    "/invoices",
    { method: "GET" },
    {
      page,
      per_page: perPage,
      filter_by: "Status.All",
      sort_column: "date",
      sort_order: "D",
    }
  );

  return {
    invoices: data.invoices ?? [],
    pageContext: data.page_context ?? null,
  };
}

export async function getAllZohoInvoices() {
  const invoices: ZohoInvoice[] = [];

  let page = 1;
  const perPage = 200;
  let hasMorePage = true;

  while (hasMorePage) {
    const result =
      await getZohoInvoices(page, perPage);

    invoices.push(...result.invoices);

    hasMorePage =
      result.pageContext?.has_more_page ??
      false;

    page += 1;

    if (page > 100) {
      throw new Error(
        "Arrêt de sécurité pendant la récupération des factures Zoho."
      );
    }
  }

  return invoices;
}

export async function getZohoInvoice(
  invoiceId: string
) {
  if (!invoiceId) {
    throw new Error(
      "Identifiant de facture Zoho manquant."
    );
  }

  const data = await zohoBooksRequest<{
    invoice?: ZohoInvoice;
  }>(
    `/invoices/${encodeURIComponent(invoiceId)}`,
    { method: "GET" }
  );

  if (!data.invoice) {
    throw new Error(
      "Facture Zoho Books introuvable."
    );
  }

  return data.invoice;
}