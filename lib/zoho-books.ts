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

/** Réponse d'erreur reçue explicitement de Zoho Books (à distinguer d'un timeout réseau). */
export class ZohoBooksApiError extends Error {
  readonly zohoCode: number | null;
  readonly httpStatus: number;

  constructor(code: number | null, httpStatus: number, message: string) {
    super(`Erreur Zoho Books (${code ?? httpStatus}) : ${message}`);
    this.name = "ZohoBooksApiError";
    this.zohoCode = code;
    this.httpStatus = httpStatus;
  }
}

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

export type ZohoTax = {
  tax_id: string;
  tax_name: string;
  tax_percentage: number;
  tax_type?: string;
  tax_specific_type?: string;
  is_value_added?: boolean;
  is_default_tax?: boolean;
};

export type ZohoItem = {
  item_id: string;
  name: string;
  description?: string;
  rate: number;
  unit?: string;
  status?: string;
  product_type?: string;
  item_type?: string;
  tax_id?: string;
  tax_name?: string;
  tax_percentage?: number;
};

export type ZohoContact = {
  contact_id: string;
  contact_name: string;
  contact_number?: string;
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

export type ZohoEstimateLineItem = {
  item_id?: string;
  line_item_id: string;
  name: string;
  description?: string;
  item_order?: number;
  product_type?: string;
  rate: number;
  quantity: number;
  unit?: string;
  discount?: string | number;
  discount_amount?: number;
  tax_id?: string;
  tax_name?: string;
  tax_type?: string;
  tax_percentage?: number;
  item_total: number;
  line_item_category?: string;
};

export type ZohoEstimateTax = {
  tax_name: string;
  tax_amount: number;
};

export type ZohoEstimateCustomField = {
  customfield_id?: string;
  index?: number;
  label?: string;
  value?: string | number | boolean | null;
  show_on_pdf?: boolean;
};

export type ZohoEstimateAddress = {
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type ZohoEstimate = {
  estimate_id: string;
  estimate_number: string;
  customer_id: string;
  customer_name: string;
  status: string;
  date: string;
  expiry_date?: string;
  total: number;
  currency_code?: string;
  reference_number?: string;
  is_emailed?: boolean;
  created_time?: string;
  last_modified_time?: string;

  line_items?: ZohoEstimateLineItem[];

  sub_total?: number;
  tax_total?: number;

  discount?: number;
  discount_type?: string;
  is_discount_before_tax?: boolean;
  is_inclusive_tax?: boolean;

  shipping_charge?: number;
  adjustment?: number;
  adjustment_description?: string;

  taxes?: ZohoEstimateTax[];

  custom_fields?: ZohoEstimateCustomField[];

  notes?: string;
  terms?: string;

  billing_address?: ZohoEstimateAddress;
  shipping_address?: ZohoEstimateAddress;

  salesperson_name?: string;
  template_name?: string;

  is_viewed_by_client?: boolean;
  client_viewed_time?: string;
};

export type ZohoEstimateEmailContent = {
  body: string;
  subject: string;
  to_mail_ids: string[];
  cc_mail_ids: string[];
  bcc_mail_ids: string[];
  from_mail_id?: string;
  from_name?: string;
  emailtemplate_id?: string;
  file_name?: string;
  mail_documents?: string[];
};

export type SendZohoEstimateEmailInput = {
  gammaPdf?: { bytes: Uint8Array; filename: string };
  to_mail_ids: string[];
  subject: string;
  body: string;
  cc_mail_ids?: string[];
  bcc_mail_ids?: string[];
};

export type ZohoInvoiceLineItem = {
  item_id?: string;
  line_item_id: string;
  name: string;
  description?: string;
  item_order?: number;
  product_type?: string;
  rate: number;
  quantity: number;
  unit?: string;
  discount?: string | number;
  discount_amount?: number;
  tax_id?: string;
  tax_name?: string;
  tax_type?: string;
  tax_percentage?: number;
  item_total: number;
  line_item_category?: string;
};

export type ZohoInvoiceTax = {
  tax_name: string;
  tax_amount: number;
};

export type ZohoInvoiceAddress = {
  address?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
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

  invoiced_estimate_id?: string;

  line_items?: ZohoInvoiceLineItem[];

  sub_total?: number;
  tax_total?: number;

  discount?: number;
  discount_type?: string;
  is_discount_before_tax?: boolean;
  is_inclusive_tax?: boolean;

  shipping_charge?: number;
  adjustment?: number;
  adjustment_description?: string;

  taxes?: ZohoInvoiceTax[];

  notes?: string;
  terms?: string;

  billing_address?: ZohoInvoiceAddress;
  shipping_address?: ZohoInvoiceAddress;

  salesperson_name?: string;
  template_name?: string;
};

export type CreateZohoContactInput = {
  contact_name: string;
  company_name?: string;
  email?: string;
  phone?: string;

  billing_address?: {
    address?: string;
    street2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
};

export type CreateZohoEstimateLineItemInput = {
  item_id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  discount?: string | number;
  tax_id?: string;
};

export type CreateZohoEstimateInput = {
  customer_id: string;
  date?: string;
  expiry_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;
  line_items: CreateZohoEstimateLineItemInput[];
};

export type UpdateZohoEstimateInput = {
  customer_id: string;
  date?: string;
  expiry_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;
  line_items: CreateZohoEstimateLineItemInput[];
};

export type CreateZohoInvoiceLineItemInput = {
  item_id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  discount?: string | number;
  tax_id?: string;
};

export type CreateZohoInvoiceInput = {
  customer_id: string;
  date?: string;
  due_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;
  line_items: CreateZohoInvoiceLineItemInput[];
};

export type UpdateZohoInvoiceLineItemInput = {
  item_id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  discount?: string | number;
  tax_id?: string;
};

export type UpdateZohoInvoiceInput = {
  customer_id: string;
  date?: string;
  due_date?: string;
  reference_number?: string;
  notes?: string;
  terms?: string;
  line_items: UpdateZohoInvoiceLineItemInput[];
};

let cachedAccessToken: {
  token: string;
  expiresAt: number;
} | null = null;

function getZohoConfig() {
  const clientId =
    process.env.ZOHO_CLIENT_ID;

  const clientSecret =
    process.env.ZOHO_CLIENT_SECRET;

  const refreshToken =
    process.env.ZOHO_REFRESH_TOKEN;

  const organizationId =
    process.env.ZOHO_ORGANIZATION_ID;

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
    cachedAccessToken.expiresAt >
      now + 60_000
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
        "Content-Type":
          "application/x-www-form-urlencoded",
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
        data.error ??
        response.statusText
      }`
    );
  }

  const expiresIn =
    typeof data.expires_in === "number"
      ? data.expires_in
      : 3600;

  cachedAccessToken = {
    token: data.access_token,
    expiresAt:
      now + expiresIn * 1000,
  };

  return data.access_token;
}

async function zohoBooksRequest<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<
    string,
    | string
    | number
    | boolean
    | undefined
  >
): Promise<ZohoApiResponse<T>> {
  const { organizationId } =
    getZohoConfig();

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
    for (
      const [key, value]
      of Object.entries(query)
    ) {
      if (value !== undefined) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  }

  const headers =
    new Headers(
      options.headers
    );

  headers.set(
    "Authorization",
    `Zoho-oauthtoken ${accessToken}`
  );

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has(
      "Content-Type"
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response =
    await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

  const data =
    (await response.json()) as ZohoApiResponse<T>;

  if (
    !response.ok ||
    data.code !== 0
  ) {
    throw new ZohoBooksApiError(
      typeof data.code === "number" ? data.code : null,
      response.status,
      typeof data.message === "string" && data.message.trim()
        ? data.message
        : response.statusText || "Réponse refusée par Zoho"
    );
  }

  return data;
}

export function getZohoOrganizationId() {
  return getZohoConfig()
    .organizationId;
}

export async function getZohoOrganizations() {
  const accessToken =
    await getZohoAccessToken();

  const response =
    await fetch(
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

  if (
    !response.ok ||
    data.code !== 0
  ) {
    throw new Error(
      `Impossible de récupérer les organisations Zoho Books : ${
        data.message ??
        response.statusText
      }`
    );
  }

  return (
    data.organizations ?? []
  );
}

export async function getZohoTaxes() {
  const data =
    await zohoBooksRequest<{
      taxes?: ZohoTax[];
    }>(
      "/settings/taxes",
      {
        method: "GET",
      }
    );

  return data.taxes ?? [];
}

export async function getZohoItems(
  page = 1,
  perPage = 200
) {
  const data =
    await zohoBooksRequest<{
      items?: ZohoItem[];
      page_context?: ZohoPageContext;
    }>(
      "/items",
      {
        method: "GET",
      },
      {
        page,
        per_page: perPage,
      }
    );

  return {
    items:
      data.items ?? [],

    pageContext:
      data.page_context ??
      null,
  };
}

export async function getAllZohoItems() {
  const items: ZohoItem[] =
    [];

  let page = 1;
  const perPage = 200;
  let hasMorePage = true;

  while (hasMorePage) {
    const result =
      await getZohoItems(
        page,
        perPage
      );

    items.push(
      ...result.items
    );

    hasMorePage =
      result.pageContext
        ?.has_more_page ??
      false;

    page += 1;

    if (page > 100) {
      throw new Error(
        "Arrêt de sécurité pendant la récupération des articles Zoho."
      );
    }
  }

  return items.filter(
    (item) =>
      !item.status ||
      item.status ===
        "active"
  );
}

export async function getZohoContacts(
  page = 1,
  perPage = 200
) {
  const data =
    await zohoBooksRequest<{
      contacts?: ZohoContact[];
      page_context?: ZohoPageContext;
    }>(
      "/contacts",
      {
        method: "GET",
      },
      {
        page,
        per_page: perPage,
        contact_type:
          "customer",
      }
    );

  return {
    contacts:
      data.contacts ?? [],

    pageContext:
      data.page_context ??
      null,
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

  const data =
    await zohoBooksRequest<{
      contact?: ZohoContact;
    }>(
      `/contacts/${encodeURIComponent(
        contactId
      )}`,
      {
        method: "GET",
      }
    );

  if (!data.contact) {
    throw new Error(
      "Contact Zoho Books introuvable."
    );
  }

  return data.contact;
}

export async function createZohoContact(
  input: CreateZohoContactInput
) {
  if (
    !input.contact_name.trim()
  ) {
    throw new Error(
      "Le nom du contact Zoho est obligatoire."
    );
  }

  const payload = {
    contact_name:
      input.contact_name.trim(),

    company_name:
      input.company_name?.trim() ||
      input.contact_name.trim(),

    contact_type:
      "customer",

    customer_sub_type:
      "business",

    email:
      input.email?.trim() ||
      undefined,

    phone:
      input.phone?.trim() ||
      undefined,

    billing_address:
      input.billing_address
        ? {
            address:
              input.billing_address.address?.trim() ||
              undefined,

            street2:
              input.billing_address.street2?.trim() ||
              undefined,

            city:
              input.billing_address.city?.trim() ||
              undefined,

            state:
              input.billing_address.state?.trim() ||
              undefined,

            zip:
              input.billing_address.zip?.trim() ||
              undefined,

            country:
              input.billing_address.country?.trim() ||
              undefined,
          }
        : undefined,
  };

  const data =
    await zohoBooksRequest<{
      contact?: ZohoContact;
    }>(
      "/contacts",
      {
        method: "POST",
        body: JSON.stringify(
          payload
        ),
      }
    );

  if (
    !data.contact?.contact_id
  ) {
    throw new Error(
      "Zoho Books a créé le contact sans retourner son identifiant."
    );
  }

  return data.contact;
}

export async function getZohoEstimates(
  page = 1,
  perPage = 200
) {
  const data =
    await zohoBooksRequest<{
      estimates?: ZohoEstimate[];
      page_context?: ZohoPageContext;
    }>(
      "/estimates",
      {
        method: "GET",
      },
      {
        page,
        per_page: perPage,
        filter_by:
          "Status.All",
        sort_column:
          "date",
        sort_order:
          "D",
      }
    );

  return {
    estimates:
      data.estimates ??
      [],

    pageContext:
      data.page_context ??
      null,
  };
}

export async function getAllZohoEstimates() {
  const estimates:
    ZohoEstimate[] = [];

  let page = 1;
  const perPage = 200;
  let hasMorePage = true;

  while (hasMorePage) {
    const result =
      await getZohoEstimates(
        page,
        perPage
      );

    estimates.push(
      ...result.estimates
    );

    hasMorePage =
      result.pageContext
        ?.has_more_page ??
      false;

    page += 1;

    if (page > 100) {
      throw new Error(
        "Arrêt de sécurité pendant la récupération des devis Zoho."
      );
    }
  }

  return estimates;
}

export async function getZohoEstimate(
  estimateId: string
) {
  if (!estimateId) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  const data =
    await zohoBooksRequest<{
      estimate?: ZohoEstimate;
    }>(
      `/estimates/${encodeURIComponent(
        estimateId
      )}`,
      {
        method: "GET",
      }
    );

  if (!data.estimate) {
    throw new Error(
      "Devis Zoho Books introuvable."
    );
  }

  return data.estimate;
}

export type ZohoEstimateEmailTracking = {
  isEmailed: boolean;
  isViewedByClient: boolean;
  viewedAt: string | null;
};

export async function getZohoEstimateEmailTracking(
  estimateId: string
): Promise<ZohoEstimateEmailTracking> {
  const normalizedEstimateId =
    estimateId.trim();

  if (!normalizedEstimateId) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  const response =
    await zohoBooksRequest<{
      comments?: Array<{
        description?: string;
        date?: string;
        time?: string;
        transaction_type?: string;
      }>;
    }>(
      `/estimates/${encodeURIComponent(
        normalizedEstimateId
      )}/comments`,
      {
        method: "GET",
      }
    );

  const emailHistory =
    (response.comments ?? []).filter(
      (comment) =>
        comment.transaction_type ===
        "email"
    );

  const sentEntry =
    emailHistory.find((comment) =>
      (comment.description ?? "")
        .toLocaleLowerCase("fr-FR")
        .includes("envoyé par e-mail")
    );

  const viewedEntry =
    emailHistory.find((comment) => {
      const description =
        (comment.description ?? "")
          .toLocaleLowerCase("fr-FR");

      return (
        description.includes(
          "consulté le devis"
        ) ||
        description.includes(
          "consulte le devis"
        )
      );
    });

  const viewedAt =
    viewedEntry?.date
      ? [
          viewedEntry.date,
          viewedEntry.time,
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  return {
    isEmailed: Boolean(sentEntry),
    isViewedByClient:
      Boolean(viewedEntry),
    viewedAt,
  };
}
export async function getZohoEstimateEmailContent(
  estimateId: string
) {
  const normalizedEstimateId =
    estimateId.trim();

  if (!normalizedEstimateId) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  type ZohoEmailContact = {
    contact_id?: string;
    contact_name?: string;
    email?: string;
    selected?: boolean;
  };

  type ZohoMailDocument =
    | string
    | {
        document_id?: string;
        selected?: boolean;
      };

  type ZohoEstimateEmailApiData = {
    from_email?: string;
    subject?: string;
    body?: string;
    to_mails_str?: string;
    to_contacts?: ZohoEmailContact[];
    cc_mails?: string[];
    bcc_mails?: string[];
    file_name_without_extension?: string;
    emailtemplate_id?: string;
    mail_documents?: ZohoMailDocument[];
    from_emails?: Array<{
      user_name?: string;
      email?: string;
      selected?: boolean;
    }>;
  };

  const response =
    await zohoBooksRequest<{
      data?: ZohoEstimateEmailApiData;
    }>(
      `/estimates/${encodeURIComponent(
        normalizedEstimateId
      )}/email`,
      {
        method: "GET",
      }
    );

  const data =
    response.data;

  if (!data) {
    throw new Error(
      "Zoho Books n'a retourné aucune donnée d'email pour ce devis."
    );
  }

  const selectedFrom =
    (data.from_emails ?? []).find(
      (item) =>
        item.selected &&
        item.email?.trim()
    );

  const firstFrom =
    (data.from_emails ?? []).find(
      (item) =>
        item.email?.trim()
    );

  const fromEmail =
    data.from_email?.trim() ||
    selectedFrom?.email?.trim() ||
    firstFrom?.email?.trim() ||
    undefined;

  const fromName =
    selectedFrom?.user_name?.trim() ||
    firstFrom?.user_name?.trim() ||
    undefined;

  const legacyToMailIds =
    (data.to_mails_str ?? "")
      .split(/[;,]/)
      .map((email) =>
        email.trim()
      )
      .filter(Boolean);

  const selectedContactEmails =
    (data.to_contacts ?? [])
      .filter(
        (contact) =>
          contact.selected &&
          contact.email?.trim()
      )
      .map(
        (contact) =>
          contact.email!.trim()
      );

  const allContactEmails =
    (data.to_contacts ?? [])
      .filter(
        (contact) =>
          contact.email?.trim()
      )
      .map(
        (contact) =>
          contact.email!.trim()
      );

  const toMailIds =
    Array.from(
      new Set(
        selectedContactEmails.length > 0
          ? selectedContactEmails
          : legacyToMailIds.length > 0
            ? legacyToMailIds
            : allContactEmails
      )
    );

  const fileName =
    data.file_name_without_extension
      ?.trim();

  const mailDocuments =
    (data.mail_documents ?? [])
      .map((document) => {
        if (
          typeof document === "string"
        ) {
          return document.trim();
        }

        if (
          document.selected === false
        ) {
          return "";
        }

        return (
          document.document_id
            ?.trim() ?? ""
        );
      })
      .filter(Boolean);

  return {
    body:
      data.body ?? "",
    subject:
      data.subject ?? "",
    to_mail_ids:
      toMailIds,
    cc_mail_ids:
      data.cc_mails ?? [],
    bcc_mail_ids:
      data.bcc_mails ?? [],
    from_mail_id:
      fromEmail,
    from_name:
      fromName,
    emailtemplate_id:
      data.emailtemplate_id,
    file_name:
      fileName
        ? `${fileName}.pdf`
        : undefined,
    mail_documents:
      mailDocuments,
  } satisfies ZohoEstimateEmailContent;
}

export async function sendZohoEstimateEmail(
  estimateId: string,
  input: SendZohoEstimateEmailInput
) {
  const normalizedEstimateId =
    estimateId.trim();

  if (!normalizedEstimateId) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  const toMailIds =
    input.to_mail_ids
      .map((email) =>
        email.trim()
      )
      .filter(Boolean);

  if (toMailIds.length === 0) {
    throw new Error(
      "Au moins une adresse email destinataire est obligatoire."
    );
  }

  if (!input.subject.trim()) {
    throw new Error(
      "Le sujet de l'email est obligatoire."
    );
  }

  if (!input.body.trim()) {
    throw new Error(
      "Le contenu de l'email est obligatoire."
    );
  }

  const payload = {
    to_mail_ids:
      toMailIds,
    cc_mail_ids:
      (input.cc_mail_ids ?? [])
        .map((email) =>
          email.trim()
        )
        .filter(Boolean),
    bcc_mail_ids:
      (input.bcc_mail_ids ?? [])
        .map((email) =>
          email.trim()
        )
        .filter(Boolean),
    subject:
      input.subject.trim(),
    body:
      input.body,
  };

  // Zoho Books accepte un PDF additionnel via "attachments".
  // Sans Gamma, on conserve intégralement la requête JSON historique.
  // Avec Gamma, les champs du message et le PDF voyagent dans une
  // seule requête multipart/form-data (sans envoi séparé).
  let requestBody: BodyInit;
  if (input.gammaPdf) {
    const { bytes, filename } = input.gammaPdf;
    if (
      bytes.byteLength < 5 ||
      bytes[0] !== 0x25 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x44 ||
      bytes[3] !== 0x46 ||
      bytes[4] !== 0x2d
    ) {
      throw new Error("Le document Gamma téléchargé n'est pas un PDF valide.");
    }

    const form = new FormData();
    // Zoho Books utilise JSONString pour les paramètres d'une
    // requête multipart comportant une pièce jointe.
    form.append("JSONString", JSON.stringify(payload));
    form.append(
      "attachments",
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      filename
    );
    requestBody = form;
  } else {
    requestBody = JSON.stringify(payload);
  }

  await zohoBooksRequest<Record<string, never>>(
    `/estimates/${encodeURIComponent(normalizedEstimateId)}/email`,
    { method: "POST", body: requestBody }
  );

  await zohoBooksRequest<Record<string, never>>(
    `/estimates/${encodeURIComponent(
      normalizedEstimateId
    )}/status/sent`,
    {
      method: "POST",
    }
  );
}

function normalizeDiscountValue(
  discount:
    | string
    | number
    | undefined
) {
  if (
    discount === undefined
  ) {
    return undefined;
  }

  if (
    typeof discount ===
    "number"
  ) {
    if (
      !Number.isFinite(
        discount
      ) ||
      discount <= 0
    ) {
      return undefined;
    }

    return `${discount}%`;
  }

  const trimmed =
    discount.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    trimmed.endsWith("%")
  ) {
    const numericValue =
      Number(
        trimmed
          .slice(0, -1)
          .replace(
            ",",
            "."
          )
      );

    if (
      !Number.isFinite(
        numericValue
      ) ||
      numericValue <= 0 ||
      numericValue > 100
    ) {
      throw new Error(
        "La remise en pourcentage doit être comprise entre 0 et 100 %."
      );
    }

    return `${numericValue}%`;
  }

  const numericValue =
    Number(
      trimmed.replace(
        ",",
        "."
      )
    );

  if (
    !Number.isFinite(
      numericValue
    ) ||
    numericValue <= 0
  ) {
    throw new Error(
      "Le montant de remise est invalide."
    );
  }

  return String(
    numericValue
  );
}

function normalizeEstimateLineItems(
  lineItems:
    CreateZohoEstimateLineItemInput[]
) {
  return lineItems.map(
    (line, index) => {
      if (
        !line.name.trim()
      ) {
        throw new Error(
          `Le nom de la ligne ${
            index + 1
          } est obligatoire.`
        );
      }

      if (
        !Number.isFinite(
          line.quantity
        ) ||
        line.quantity <= 0
      ) {
        throw new Error(
          `La quantité de la ligne ${
            index + 1
          } doit être supérieure à zéro.`
        );
      }

      if (
        !Number.isFinite(
          line.rate
        ) ||
        line.rate < 0
      ) {
        throw new Error(
          `Le prix de la ligne ${
            index + 1
          } est invalide.`
        );
      }

      return {
        item_id:
          line.item_id
            ?.trim() ||
          undefined,

        name:
          line.name.trim(),

        description:
          line.description
            ?.trim() ||
          undefined,

        quantity:
          line.quantity,

        rate:
          line.rate,

        discount:
          normalizeDiscountValue(
            line.discount
          ),

        tax_id:
          line.tax_id
            ?.trim() ||
          undefined,
      };
    }
  );
}

export async function createZohoEstimate(
  input: CreateZohoEstimateInput
) {
  if (
    !input.customer_id.trim()
  ) {
    throw new Error(
      "Le client Zoho est obligatoire pour créer un devis."
    );
  }

  if (
    !input.line_items ||
    input.line_items
      .length === 0
  ) {
    throw new Error(
      "Le devis doit contenir au moins une ligne."
    );
  }

  const payload = {
    customer_id:
      input.customer_id.trim(),

    date:
      input.date?.trim() ||
      undefined,

    expiry_date:
      input.expiry_date?.trim() ||
      undefined,

    reference_number:
      input.reference_number?.trim() ||
      undefined,

    notes:
      input.notes?.trim() ||
      undefined,

    terms:
      input.terms?.trim() ||
      undefined,

    line_items:
      normalizeEstimateLineItems(
        input.line_items
      ),
  };

  const data =
    await zohoBooksRequest<{
      estimate?: ZohoEstimate;
    }>(
      "/estimates",
      {
        method: "POST",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.estimate
      ?.estimate_id
  ) {
    throw new Error(
      "Zoho Books a créé le devis sans retourner son identifiant."
    );
  }

  return data.estimate;
}

export async function updateZohoEstimate(
  estimateId: string,
  input: UpdateZohoEstimateInput
) {
  if (!estimateId) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  if (
    !input.customer_id.trim()
  ) {
    throw new Error(
      "Le client Zoho est obligatoire pour modifier un devis."
    );
  }

  if (
    !input.line_items ||
    input.line_items
      .length === 0
  ) {
    throw new Error(
      "Le devis doit contenir au moins une ligne."
    );
  }

  const payload = {
    customer_id:
      input.customer_id.trim(),

    date:
      input.date?.trim() ||
      undefined,

    expiry_date:
      input.expiry_date?.trim() ||
      undefined,

    reference_number:
      input.reference_number?.trim() ||
      undefined,

    notes:
      input.notes?.trim() ||
      undefined,

    terms:
      input.terms?.trim() ||
      undefined,

    line_items:
      normalizeEstimateLineItems(
        input.line_items
      ),
  };

  const data =
    await zohoBooksRequest<{
      estimate?: ZohoEstimate;
    }>(
      `/estimates/${encodeURIComponent(
        estimateId
      )}`,
      {
        method: "PUT",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.estimate
      ?.estimate_id
  ) {
    throw new Error(
      "Zoho Books a modifié le devis sans retourner son identifiant."
    );
  }

  return data.estimate;
}

export async function getZohoInvoices(
  page = 1,
  perPage = 200
) {
  const data =
    await zohoBooksRequest<{
      invoices?: ZohoInvoice[];
      page_context?: ZohoPageContext;
    }>(
      "/invoices",
      {
        method: "GET",
      },
      {
        page,
        per_page:
          perPage,
        filter_by:
          "Status.All",
        sort_column:
          "date",
        sort_order:
          "D",
      }
    );

  return {
    invoices:
      data.invoices ?? [],

    pageContext:
      data.page_context ??
      null,
  };
}

export async function getAllZohoInvoices() {
  const invoices:
    ZohoInvoice[] = [];

  let page = 1;
  const perPage = 200;
  let hasMorePage = true;

  while (hasMorePage) {
    const result =
      await getZohoInvoices(
        page,
        perPage
      );

    invoices.push(
      ...result.invoices
    );

    hasMorePage =
      result.pageContext
        ?.has_more_page ??
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

  const data =
    await zohoBooksRequest<{
      invoice?: ZohoInvoice;
    }>(
      `/invoices/${encodeURIComponent(
        invoiceId
      )}`,
      {
        method: "GET",
      }
    );

  if (!data.invoice) {
    throw new Error(
      "Facture Zoho Books introuvable."
    );
  }

  return data.invoice;
}

function normalizeInvoiceLineItems(
  lineItems:
    (
      | CreateZohoInvoiceLineItemInput
      | UpdateZohoInvoiceLineItemInput
    )[]
) {
  return lineItems.map(
    (line, index) => {
      if (
        !line.name.trim()
      ) {
        throw new Error(
          `Le nom de la ligne ${
            index + 1
          } est obligatoire.`
        );
      }

      if (
        !Number.isFinite(
          line.quantity
        ) ||
        line.quantity <= 0
      ) {
        throw new Error(
          `La quantité de la ligne ${
            index + 1
          } doit être supérieure à zéro.`
        );
      }

      if (
        !Number.isFinite(
          line.rate
        )
      ) {
        throw new Error(
          `Le prix de la ligne ${
            index + 1
          } est invalide.`
        );
      }

      return {
        item_id:
          line.item_id
            ?.trim() ||
          undefined,

        name:
          line.name.trim(),

        description:
          line.description
            ?.trim() ||
          undefined,

        quantity:
          line.quantity,

        rate:
          line.rate,

        discount:
          line.rate < 0
            ? undefined
            : normalizeDiscountValue(
                line.discount
              ),

        tax_id:
          line.tax_id
            ?.trim() ||
          undefined,
      };
    }
  );
}

export async function createZohoInvoice(
  input: CreateZohoInvoiceInput
) {
  if (
    !input.customer_id.trim()
  ) {
    throw new Error(
      "Le client Zoho est obligatoire pour créer une facture."
    );
  }

  if (
    !input.line_items ||
    input.line_items.length === 0
  ) {
    throw new Error(
      "La facture doit contenir au moins une ligne."
    );
  }

  const payload = {
    customer_id:
      input.customer_id.trim(),

    date:
      input.date?.trim() ||
      undefined,

    due_date:
      input.due_date?.trim() ||
      undefined,

    reference_number:
      input.reference_number?.trim() ||
      undefined,

    notes:
      input.notes?.trim() ||
      undefined,

    terms:
      input.terms?.trim() ||
      undefined,

    line_items:
      normalizeInvoiceLineItems(
        input.line_items
      ),
  };

  const data =
    await zohoBooksRequest<{
      invoice?: ZohoInvoice;
    }>(
      "/invoices",
      {
        method: "POST",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.invoice
      ?.invoice_id
  ) {
    throw new Error(
      "Zoho Books a créé la facture sans retourner son identifiant."
    );
  }

  return getZohoInvoice(
    data.invoice.invoice_id
  );
}

export async function updateZohoInvoice(
  invoiceId: string,
  input: UpdateZohoInvoiceInput
) {
  if (!invoiceId) {
    throw new Error(
      "Identifiant de facture Zoho manquant."
    );
  }

  if (
    !input.customer_id.trim()
  ) {
    throw new Error(
      "Le client Zoho est obligatoire pour modifier une facture."
    );
  }

  if (
    !input.line_items ||
    input.line_items.length === 0
  ) {
    throw new Error(
      "La facture doit contenir au moins une ligne."
    );
  }

  const payload = {
    customer_id:
      input.customer_id.trim(),

    date:
      input.date?.trim() ||
      undefined,

    due_date:
      input.due_date?.trim() ||
      undefined,

    reference_number:
      input.reference_number?.trim() ||
      undefined,

    notes:
      input.notes?.trim() ||
      undefined,

    terms:
      input.terms?.trim() ||
      undefined,

    line_items:
      normalizeInvoiceLineItems(
        input.line_items
      ),
  };

  const data =
    await zohoBooksRequest<{
      invoice?: ZohoInvoice;
    }>(
      `/invoices/${encodeURIComponent(
        invoiceId
      )}`,
      {
        method: "PUT",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.invoice
      ?.invoice_id
  ) {
    throw new Error(
      "Zoho Books a modifié la facture sans retourner son identifiant."
    );
  }

  return data.invoice;
}

function getInvoiceDiscountFromEstimateLine(
  line: ZohoEstimateLineItem
) {
  if (
    typeof line.discount ===
    "string"
  ) {
    const trimmed =
      line.discount.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  if (
    typeof line.discount ===
      "number" &&
    Number.isFinite(
      line.discount
    ) &&
    line.discount > 0
  ) {
    return `${line.discount}%`;
  }

  const discountAmount =
    Number(
      line.discount_amount
    ) || 0;

  if (
    discountAmount > 0
  ) {
    return String(
      discountAmount
    );
  }

  return undefined;
}

function normalizeInvoiceLinesFromEstimate(
  estimate: ZohoEstimate
) {
  const lineItems =
    estimate.line_items ??
    [];

  if (
    lineItems.length === 0
  ) {
    throw new Error(
      "Le devis ne contient aucune ligne facturable."
    );
  }

  return lineItems.map(
    (line, index) => {
      const quantity =
        Number(
          line.quantity
        );

      const rate =
        Number(
          line.rate
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `La quantité de la ligne ${
            index + 1
          } du devis est invalide.`
        );
      }

      if (
        !Number.isFinite(
          rate
        ) ||
        rate < 0
      ) {
        throw new Error(
          `Le prix de la ligne ${
            index + 1
          } du devis est invalide.`
        );
      }

      return {
        item_id:
          line.item_id ||
          undefined,

        name:
          line.name,

        description:
          line.description ||
          undefined,

        quantity,

        rate,

        discount:
          getInvoiceDiscountFromEstimateLine(
            line
          ),

        tax_id:
          line.tax_id ||
          undefined,
      };
    }
  );
}

export async function createZohoInvoiceFromEstimate(
  estimateId: string
) {
  const normalizedEstimateId =
    estimateId.trim();

  if (
    !normalizedEstimateId
  ) {
    throw new Error(
      "Identifiant de devis Zoho manquant."
    );
  }

  const estimate =
    await getZohoEstimate(
      normalizedEstimateId
    );

  if (
    estimate.status ===
    "invoiced"
  ) {
    throw new Error(
      "Ce devis est déjà facturé dans Zoho Books."
    );
  }

  if (
    estimate.status !==
    "accepted"
  ) {
    throw new Error(
      "Seul un devis accepté peut être transformé en facture."
    );
  }

  const lineItems =
    normalizeInvoiceLinesFromEstimate(
      estimate
    );

  const payload = {
    customer_id:
      estimate.customer_id,

    invoiced_estimate_id:
      estimate.estimate_id,

    reference_number:
      estimate.reference_number ||
      undefined,

    salesperson_name:
      estimate.salesperson_name ||
      undefined,

    notes:
      estimate.notes ||
      undefined,

    terms:
      estimate.terms ||
      undefined,

    shipping_charge:
      Number(
        estimate.shipping_charge
      ) || undefined,

    adjustment:
      Number(
        estimate.adjustment
      ) || undefined,

    adjustment_description:
      estimate
        .adjustment_description ||
      undefined,

    line_items:
      lineItems,
  };

  const data =
    await zohoBooksRequest<{
      invoice?: ZohoInvoice;
    }>(
      "/invoices",
      {
        method: "POST",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.invoice
      ?.invoice_id
  ) {
    throw new Error(
      `Zoho Books n'a pas retourné la facture créée. Réponse : ${
        data.message ||
        "aucun détail fourni"
      }`
    );
  }

  return getZohoInvoice(
    data.invoice.invoice_id
  );
}


// ------------------------------------------------------------
// Avoirs Zoho Books — lecture uniquement (V2.5.2, étape 1).
// La création et l'application d'un avoir seront ajoutées après
// vérification des droits OAuth et du comportement de Zoho.
// ------------------------------------------------------------

export type ZohoCreditNoteLineItem = {
  line_item_id?: string;
  item_id?: string;
  name?: string;
  description?: string;
  quantity?: number;
  rate?: number;
  discount?: string | number;
  tax_id?: string;
  tax_percentage?: number;
  item_total?: number;
};

export type ZohoCreditNote = {
  creditnote_id: string;
  creditnote_number?: string;
  customer_id: string;
  customer_name?: string;
  status?: string;
  date?: string;
  total?: number;
  balance?: number;
  currency_code?: string;
  reference_number?: string;
  notes?: string;
  line_items?: ZohoCreditNoteLineItem[];
  invoices?: Array<{
    invoice_id: string;
    invoice_number?: string;
    amount?: number;
  }>;
};

export async function getZohoCreditNotes(
  page = 1,
  perPage = 200
) {
  const data = await zohoBooksRequest<{
    creditnotes?: ZohoCreditNote[];
    page_context?: ZohoPageContext;
  }>(
    "/creditnotes",
    { method: "GET" },
    { page, per_page: perPage }
  );

  return {
    creditNotes: data.creditnotes ?? [],
    pageContext: data.page_context ?? null,
  };
}

export async function getAllZohoCreditNotes() {
  const creditNotes: ZohoCreditNote[] = [];
  let page = 1;
  let hasMorePage = true;

  while (hasMorePage) {
    const result = await getZohoCreditNotes(page);
    creditNotes.push(...result.creditNotes);
    hasMorePage = result.pageContext?.has_more_page ?? false;
    page += 1;

    if (page > 100) {
      throw new Error(
        "Arrêt de sécurité pendant la récupération des avoirs Zoho."
      );
    }
  }

  return creditNotes;
}

export async function getZohoCreditNote(creditNoteId: string) {
  const normalizedId = creditNoteId.trim();
  if (!normalizedId) {
    throw new Error("Identifiant d'avoir Zoho manquant.");
  }

  const data = await zohoBooksRequest<{
    creditnote?: ZohoCreditNote;
  }>(
    `/creditnotes/${encodeURIComponent(normalizedId)}`,
    { method: "GET" }
  );

  if (!data.creditnote?.creditnote_id) {
    throw new Error("Avoir Zoho Books introuvable.");
  }

  return data.creditnote;
}


/**
 * Vérification préliminaire d'une facture pour un avoir total brouillon.
 * Les factures réglées restent éligibles : leur remboursement est une opération séparée.
 * Ne jamais déduire de cette vérification qu'une imputation est autorisée.
 */
export function prepareZohoCreditNoteLines(invoice: ZohoInvoice): {
  lines: CreateZohoCreditNoteLineItemInput[];
  blockingReason: string | null;
} {
  if (["draft", "void"].includes(invoice.status)) {
    return { lines: [], blockingReason: "Une facture brouillon ou annulée ne peut pas être créditée ici." };
  }
  if (!invoice.invoice_number || !invoice.customer_id || !invoice.invoice_id) {
    return { lines: [], blockingReason: "Informations obligatoires de la facture manquantes." };
  }
  if (!Number.isFinite(invoice.total) || invoice.total <= 0 ||
      !Number.isFinite(invoice.balance) || invoice.balance < 0 ||
      invoice.balance > invoice.total + 0.01) {
    return { lines: [], blockingReason: "Montants de facture incohérents." };
  }
  // Les remises globales et ajustements ne se reproduisent pas fidèlement
  // par une simple recopie des lignes : ne pas les deviner.
  if (invoice.discount || invoice.shipping_charge || invoice.adjustment || invoice.is_inclusive_tax) {
    return { lines: [], blockingReason: "Remise globale, frais, ajustement ou TVA incluse : traitement manuel nécessaire." };
  }
  const original = invoice.line_items ?? [];
  if (!original.length) return { lines: [], blockingReason: "La facture ne contient aucune ligne." };

  const lines: CreateZohoCreditNoteLineItemInput[] = [];
  for (let index = 0; index < original.length; index++) {
    const line = original[index];
    const label = `Ligne ${index + 1}`;
    if (!line.line_item_id || (!line.item_id && !line.name) ||
        !Number.isFinite(line.quantity) || line.quantity <= 0 ||
        !Number.isFinite(line.rate) || !Number.isFinite(line.item_total)) {
      return { lines: [], blockingReason: `${label} : données manquantes ou invalides.` };
    }
    if (line.tax_percentage && !line.tax_id) {
      return { lines: [], blockingReason: `${label} : identifiant de TVA Zoho manquant.` };
    }
    const gross = Math.round(line.quantity * line.rate * 100);
    const net = Math.round(line.item_total * 100);
    const difference = gross - net;
    let discount: string | undefined;
    const raw = line.discount;
    if (typeof raw === "string" && raw.trim().endsWith("%")) {
      const pct = Number(raw.trim().slice(0, -1).replace(",", "."));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100 ||
          Math.abs(Math.round(gross * (1 - pct / 100)) - net) > 1) {
        return { lines: [], blockingReason: `${label} : pourcentage de remise incohérent.` };
      }
      discount = `${pct}%`;
    } else {
      // Une remise non suffixée de % est une remise fixe. On la vérifie
      // contre le total hors taxe de ligne retourné par Zoho.
      const amount = raw !== undefined && raw !== null && String(raw).trim() !== "" && Number(raw) !== 0
        ? Number(String(raw).replace(",", "."))
        : Number(line.discount_amount || 0);
      if (!Number.isFinite(amount) || amount < 0 ||
          Math.abs(Math.round(amount * 100) - difference) > 1) {
        return { lines: [], blockingReason: `${label} : remise incompatible avec le montant de ligne.` };
      }
      if (amount > 0) discount = String(amount);
    }
    // Les lignes négatives sont conservées à l'identique : elles font
    // partie du calcul de la facture (ex. remise régie).
    lines.push({
      item_id: line.item_id,
      invoice_item_id: line.line_item_id,
      name: line.name,
      description: line.description,
      quantity: line.quantity,
      rate: line.rate,
      discount,
      tax_id: line.tax_id,
    });
  }
  return { lines, blockingReason: null };
}

// ------------------------------------------------------------
// Avoirs Zoho Books — opérations explicites (V2.5.2, étape 2).
// Aucun avoir n'est créé ou imputé automatiquement.
// La numérotation reste entièrement gérée par Zoho Books.
// ------------------------------------------------------------

export type CreateZohoCreditNoteLineItemInput = {
  item_id?: string;
  invoice_item_id?: string;
  name?: string;
  description?: string;
  quantity: number;
  rate: number;
  discount?: string;
  tax_id?: string;
};

export type CreateZohoCreditNoteInput = {
  customer_id: string;
  invoice_id?: string;
  date: string;
  notes?: string;
  reference_number?: string;
  line_items: CreateZohoCreditNoteLineItemInput[];
};

/** Crée uniquement un brouillon. Son application à une facture est une action distincte. */
export async function createZohoCreditNoteDraft(
  input: CreateZohoCreditNoteInput
): Promise<ZohoCreditNote> {
  const customerId = input.customer_id?.trim();
  const invoiceId = input.invoice_id?.trim();
  if (!customerId) throw new Error("Le client Zoho est obligatoire pour créer un avoir.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("La date de l'avoir doit être au format AAAA-MM-JJ.");
  }
  if (!input.line_items?.length) {
    throw new Error("L'avoir doit contenir au moins une ligne.");
  }

  // Vérification de cohérence si l'avoir est préparé à partir d'une facture.
  if (invoiceId) {
    const invoice = await getZohoInvoice(invoiceId);
    if (invoice.customer_id !== customerId) {
      throw new Error("Le client de l'avoir ne correspond pas à celui de la facture.");
    }
  }

  const lineItems = input.line_items.map((line, index) => {
    const quantity = Number(line.quantity);
    const rate = Number(line.rate);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Quantité invalide à la ligne ${index + 1}.`);
    }
    if (!Number.isFinite(rate)) {
      throw new Error(`Prix invalide à la ligne ${index + 1}.`);
    }
    if (!line.item_id?.trim() && !line.name?.trim()) {
      throw new Error(`Article ou libellé manquant à la ligne ${index + 1}.`);
    }
    return {
      item_id: line.item_id?.trim() || undefined,
      invoice_item_id: line.invoice_item_id?.trim() || undefined,
      name: line.name?.trim() || undefined,
      description: line.description?.trim() || undefined,
      quantity,
      rate,
      discount: line.discount?.trim() || undefined,
      tax_id: line.tax_id?.trim() || undefined,
    };
  });

  const payload = {
    customer_id: customerId,
    date: input.date,
    is_draft: true,
    reference_number: input.reference_number?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    line_items: lineItems,
  };

  const data = await zohoBooksRequest<{ creditnote?: ZohoCreditNote }>(
    "/creditnotes",
    { method: "POST", body: JSON.stringify(payload) },
    invoiceId ? { invoice_id: invoiceId } : undefined
  );
  if (!data.creditnote?.creditnote_id) {
    throw new Error("Zoho Books n'a pas retourné l'identifiant de l'avoir créé.");
  }
  return getZohoCreditNote(data.creditnote.creditnote_id);
}

/** Liste les imputations déjà enregistrées pour éviter les suppositions de statut. */
export async function getZohoCreditNoteAppliedInvoices(creditNoteId: string) {
  const id = creditNoteId.trim();
  if (!id) throw new Error("Identifiant d'avoir Zoho manquant.");
  const data = await zohoBooksRequest<{
    invoices?: Array<{
      creditnote_invoice_id?: string;
      invoice_id: string;
      invoice_number?: string;
      amount_applied?: number;
      amount?: number;
    }>;
  }>(`/creditnotes/${encodeURIComponent(id)}/invoices`, { method: "GET" });
  return data.invoices ?? [];
}

/** Impute un avoir existant sur une facture, après contrôles côté serveur. */
export async function applyZohoCreditNoteToInvoice(
  creditNoteId: string,
  invoiceId: string,
  amount: number
): Promise<{ creditNote: ZohoCreditNote; invoice: ZohoInvoice }> {
  const creditId = creditNoteId.trim();
  const invoiceIdTrimmed = invoiceId.trim();
  if (!creditId || !invoiceIdTrimmed) {
    throw new Error("L'avoir et la facture sont obligatoires.");
  }
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
    throw new Error("Le montant à imputer doit être positif et comporter au maximum deux décimales.");
  }

  const [credit, invoice] = await Promise.all([
    getZohoCreditNote(creditId),
    getZohoInvoice(invoiceIdTrimmed),
  ]);
  if (credit.customer_id !== invoice.customer_id) {
    throw new Error("L'avoir et la facture ne concernent pas le même client.");
  }
  if (credit.currency_code && invoice.currency_code && credit.currency_code !== invoice.currency_code) {
    throw new Error("L'avoir et la facture n'utilisent pas la même devise.");
  }
  if (credit.status !== "open") {
    throw new Error("Seul un avoir ouvert peut être imputé à une facture.");
  }
  if (typeof credit.balance !== "number" || typeof invoice.balance !== "number") {
    throw new Error("Soldes indisponibles : impossible de vérifier l'imputation.");
  }
  const cents = Math.round(amount * 100);
  if (cents > Math.round(credit.balance * 100) || cents > Math.round(invoice.balance * 100)) {
    throw new Error("Le montant dépasse le solde disponible de l'avoir ou de la facture.");
  }

  await zohoBooksRequest<Record<string, never>>(
    `/creditnotes/${encodeURIComponent(creditId)}/invoices`,
    {
      method: "POST",
      body: JSON.stringify({ invoices: [{ invoice_id: invoiceIdTrimmed, amount_applied: cents / 100 }] }),
    }
  );

  // Relire la vérité comptable dans Zoho après l'opération.
  const [updatedCredit, updatedInvoice] = await Promise.all([
    getZohoCreditNote(creditId),
    getZohoInvoice(invoiceIdTrimmed),
  ]);
  return { creditNote: updatedCredit, invoice: updatedInvoice };
}


/**
 * Ouvre explicitement un avoir brouillon après comparaison avec la facture d'origine.
 * N'effectue AUCUNE imputation ni aucun remboursement.
 * En cas de réponse incertaine de Zoho, relire l'avoir avant toute nouvelle action.
 */
export async function openZohoCreditNoteForInvoice(
  creditNoteId: string,
  invoiceId: string
): Promise<ZohoCreditNote> {
  const creditId = creditNoteId.trim();
  const sourceInvoiceId = invoiceId.trim();
  if (!/^\d+$/.test(creditId) || !/^\d+$/.test(sourceInvoiceId)) {
    throw new Error("Identifiant d'avoir ou de facture invalide.");
  }

  const [credit, invoice] = await Promise.all([
    getZohoCreditNote(creditId),
    getZohoInvoice(sourceInvoiceId),
  ]);

  if (credit.status !== "draft") {
    throw new Error("L'avoir doit être au statut brouillon pour être ouvert.");
  }
  if (invoice.status === "draft" || invoice.status === "void") {
    throw new Error("Une facture brouillon ou annulée ne peut pas être créditée.");
  }
  if (credit.customer_id !== invoice.customer_id) {
    throw new Error("L'avoir et la facture ne correspondent pas au même client.");
  }
  if (credit.currency_code && invoice.currency_code && credit.currency_code !== invoice.currency_code) {
    throw new Error("La devise de l'avoir diffère de celle de la facture.");
  }
  if (credit.reference_number !== invoice.invoice_number ||
      !credit.notes?.includes(`Facture d'origine : ${invoice.invoice_number}`)) {
    throw new Error("Le lien explicite entre l'avoir et la facture n'est pas vérifié.");
  }
  if (!Number.isFinite(credit.total) || !Number.isFinite(invoice.total) ||
      Number(credit.total) <= 0 ||
      Math.round(Number(credit.total) * 100) !== Math.round(invoice.total * 100)) {
    throw new Error("Le montant TTC de l'avoir diffère de celui de la facture.");
  }

  const alreadyApplied = await getZohoCreditNoteAppliedInvoices(creditId);
  if (alreadyApplied.length > 0) {
    throw new Error("Cet avoir comporte déjà des imputations : ouverture automatique interdite.");
  }

  // Passage au statut ouvert : opération comptable explicite.
  await zohoBooksRequest<Record<string, never>>(
    `/creditnotes/${encodeURIComponent(creditId)}/status/open`,
    { method: "POST" }
  );

  const updated = await getZohoCreditNote(creditId);
  if (updated.status !== "open") {
    throw new Error("Zoho a reçu la demande, mais le statut ouvert n'est pas confirmé : vérifier manuellement.");
  }
  return updated;
}
