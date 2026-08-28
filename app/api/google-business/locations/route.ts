import {
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

const GOOGLE_BUSINESS_INFORMATION_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";

const LOCATION_READ_MASK = [
  "name",
  "title",
  "storeCode",
  "websiteUri",
  "phoneNumbers",
  "storefrontAddress",
  "categories",
  "metadata",
  "openInfo",
].join(",");

type GoogleBusinessConnection = {
  id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
};

type GoogleBusinessAccount = {
  name: string;
  accountName?: string;
  type?: string;
};

type GoogleBusinessLocation = {
  name: string;
  title?: string;
  storeCode?: string;
  websiteUri?: string;
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  storefrontAddress?: {
    regionCode?: string;
    languageCode?: string;
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
    addressLines?: string[];
  };
  categories?: {
    primaryCategory?: {
      name?: string;
      displayName?: string;
    };
    additionalCategories?: Array<{
      name?: string;
      displayName?: string;
    }>;
  };
  metadata?: {
    placeId?: string;
    mapsUri?: string;
    newReviewUri?: string;
  };
  openInfo?: {
    status?: string;
  };
};

async function refreshAccessToken(
  connection: GoogleBusinessConnection
) {
  const clientId =
    process.env.GOOGLE_BUSINESS_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "La configuration Google Business Profile est incomplète."
    );
  }

  if (
    !connection.refresh_token
  ) {
    throw new Error(
      "Aucun refresh token Google Business Profile n’est disponible. Reconnectez le compte Google."
    );
  }

  const response =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          new URLSearchParams({
            client_id:
              clientId,
            client_secret:
              clientSecret,
            refresh_token:
              connection.refresh_token,
            grant_type:
              "refresh_token",
          }),
        cache:
          "no-store",
      }
    );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.access_token
  ) {
    throw new Error(
      result.error_description ??
        result.error ??
        "Impossible de renouveler l’accès Google Business Profile."
    );
  }

  const expiresAt =
    new Date(
      Date.now() +
        Number(
          result.expires_in ??
          3600
        ) *
          1000
    ).toISOString();

  const {
    error:
      updateError,
  } = await supabaseAdmin
    .from(
      "google_business_connection"
    )
    .update({
      access_token:
        result.access_token,
      expires_at:
        expiresAt,
      token_type:
        result.token_type ??
        null,
      scope:
        result.scope ??
        null,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      connection.id
    );

  if (
    updateError
  ) {
    throw new Error(
      `Impossible de mettre à jour la connexion Google Business Profile : ${updateError.message}`
    );
  }

  return result.access_token as string;
}

async function getAccessToken(
  connection: GoogleBusinessConnection
) {
  const expiresAt =
    new Date(
      connection.expires_at
    ).getTime();

  if (
    Number.isFinite(
      expiresAt
    ) &&
    expiresAt >
      Date.now() +
        60_000
  ) {
    return connection.access_token;
  }

  return refreshAccessToken(
    connection
  );
}

export async function GET() {
  try {
    const {
      data:
        connection,
      error:
        connectionError,
    } = await supabaseAdmin
      .from(
        "google_business_connection"
      )
      .select(
        `
          id,
          access_token,
          refresh_token,
          expires_at
        `
      )
      .limit(1)
      .maybeSingle();

    if (
      connectionError
    ) {
      throw new Error(
        `Impossible de charger la connexion Google Business Profile : ${connectionError.message}`
      );
    }

    if (
      !connection
    ) {
      return NextResponse.json(
        {
          success:
            false,
          connected:
            false,
          message:
            "Google Business Profile n’est pas encore connecté.",
        },
        {
          status:
            401,
        }
      );
    }

    const accessToken =
      await getAccessToken(
        connection as GoogleBusinessConnection
      );

    const accountsResponse =
      await fetch(
        GOOGLE_ACCOUNTS_URL,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache:
            "no-store",
        }
      );

    const accountsResult =
      await accountsResponse.json();

    if (
      !accountsResponse.ok
    ) {
      throw new Error(
        accountsResult.error
          ?.message ??
          "Impossible de récupérer les comptes Google Business Profile."
      );
    }

    const accounts =
      (accountsResult.accounts ??
        []) as GoogleBusinessAccount[];

    const locations:
      Array<
        GoogleBusinessLocation & {
          account_name: string;
          account_label: string;
        }
      > = [];

    for (
      const account of accounts
    ) {
      if (
        !account.name
      ) {
        continue;
      }

      const params =
        new URLSearchParams({
          readMask:
            LOCATION_READ_MASK,
          pageSize:
            "100",
        });

      const locationsResponse =
        await fetch(
          `${GOOGLE_BUSINESS_INFORMATION_URL}/${account.name}/locations?${params.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
            cache:
              "no-store",
          }
        );

      const locationsResult =
        await locationsResponse.json();

      if (
        !locationsResponse.ok
      ) {
        throw new Error(
          locationsResult.error
            ?.message ??
            `Impossible de récupérer les établissements du compte ${account.accountName ?? account.name}.`
        );
      }

      for (
        const location of
          (locationsResult.locations ??
            []) as GoogleBusinessLocation[]
      ) {
        locations.push({
          ...location,
          account_name:
            account.name,
          account_label:
            account.accountName ??
            account.name,
        });
      }
    }

    return NextResponse.json({
      success:
        true,
      connected:
        true,
      count:
        locations.length,
      locations:
        locations.map(
          (location) => ({
            name:
              location.name,
            title:
              location.title ??
              "",
            account_name:
              location.account_name,
            account_label:
              location.account_label,
            store_code:
              location.storeCode ??
              null,
            website_uri:
              location.websiteUri ??
              null,
            primary_phone:
              location.phoneNumbers
                ?.primaryPhone ??
              null,
            address:
              location.storefrontAddress ??
              null,
            primary_category:
              location.categories
                ?.primaryCategory
                ?.displayName ??
              null,
            place_id:
              location.metadata
                ?.placeId ??
              null,
            maps_uri:
              location.metadata
                ?.mapsUri ??
              null,
            new_review_uri:
              location.metadata
                ?.newReviewUri ??
              null,
            open_status:
              location.openInfo
                ?.status ??
              null,
          })
        ),
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success:
          false,
        connected:
          true,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer les établissements Google Business Profile.",
      },
      {
        status:
          500,
      }
    );
  }
}
