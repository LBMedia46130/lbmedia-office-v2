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
  role?: string;
  verificationState?: string;
  vettedState?: string;
};

type GoogleAccountsResponse = {
  accounts?: GoogleBusinessAccount[];
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

  const expiresIn =
    Number(
      result.expires_in ??
      3600
    );

  const expiresAt =
    new Date(
      Date.now() +
        expiresIn * 1000
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

  return {
    accessToken:
      result.access_token as string,

    expiresAt,
  };
}

async function getAccessToken(
  connection: GoogleBusinessConnection
) {
  const expiresAt =
    new Date(
      connection.expires_at
    ).getTime();

  const shouldRefresh =
    !Number.isFinite(
      expiresAt
    ) ||
    expiresAt <=
      Date.now() +
        60_000;

  if (
    !shouldRefresh
  ) {
    return connection.access_token;
  }

  const refreshed =
    await refreshAccessToken(
      connection
    );

  return refreshed.accessToken;
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

    const response =
      await fetch(
        GOOGLE_ACCOUNTS_URL,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          cache:
            "no-store",
        }
      );

    const result =
      (await response.json()) as
        GoogleAccountsResponse & {
          error?: {
            message?: string;
            status?: string;
          };
        };

    if (
      !response.ok
    ) {
      throw new Error(
        result.error
          ?.message ??
          "Impossible de récupérer les comptes Google Business Profile."
      );
    }

    const accounts =
      result.accounts ??
      [];

    return NextResponse.json({
      success:
        true,

      connected:
        true,

      count:
        accounts.length,

      accounts:
        accounts.map(
          (account) => ({
            name:
              account.name,

            account_name:
              account.accountName ??
              "",

            type:
              account.type ??
              null,

            role:
              account.role ??
              null,

            verification_state:
              account.verificationState ??
              null,

            vetted_state:
              account.vettedState ??
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
            : "Impossible de récupérer les comptes Google Business Profile.",
      },
      {
        status:
          500,
      }
    );
  }
}
