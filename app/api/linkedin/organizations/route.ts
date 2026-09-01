import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

const LINKEDIN_VERSION =
  "202608";

type LinkedInConnection = {
  id: string;
  access_token: string;
  expires_at: string | null;
};

type OrganizationAcl = {
  organization?: string;
  organizationTarget?: string;
  role?: string;
  state?: string;
};

type OrganizationAclResponse = {
  elements?: OrganizationAcl[];
};

type LinkedInOrganization = {
  id?: number;
  localizedName?: string;
  vanityName?: string;
  localizedWebsite?: string;
  $URN?: string;
};

async function readLinkedInResponse(
  response: Response
) {
  const rawResponse =
    await response.text();

  if (!rawResponse) {
    return null;
  }

  try {
    return JSON.parse(
      rawResponse
    ) as unknown;
  } catch {
    return rawResponse;
  }
}

function getOrganizationUrn(
  acl: OrganizationAcl
) {
  return (
    acl.organization ??
    acl.organizationTarget ??
    null
  );
}

function getOrganizationId(
  urn: string
) {
  const match =
    urn.match(
      /^urn:li:organization:(\d+)$/
    );

  return match?.[1] ?? null;
}

export async function GET() {
  const {
    data: connection,
    error: connectionError,
  } = await supabaseAdmin
    .from("linkedin_connection")
    .select(
      "id, access_token, expires_at"
    )
    .limit(1)
    .maybeSingle<LinkedInConnection>();

  if (connectionError) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Impossible de charger la connexion LinkedIn.",
        error:
          connectionError.message,
      },
      {
        status: 500,
      }
    );
  }

  if (!connection) {
    return NextResponse.json(
      {
        success: false,
        message:
          "LinkedIn n'est pas encore connecté à Office.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    connection.expires_at &&
    new Date(
      connection.expires_at
    ).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Le jeton LinkedIn a expiré. Reconnecte LinkedIn depuis Office.",
      },
      {
        status: 401,
      }
    );
  }

  const headers = {
    Authorization:
      `Bearer ${connection.access_token}`,
    "X-Restli-Protocol-Version":
      "2.0.0",
    "LinkedIn-Version":
      LINKEDIN_VERSION,
    "Content-Type":
      "application/json",
  };

  const aclUrl =
    new URL(
      "https://api.linkedin.com/rest/organizationAcls"
    );

  aclUrl.searchParams.set(
    "q",
    "roleAssignee"
  );

  aclUrl.searchParams.set(
    "role",
    "ADMINISTRATOR"
  );

  aclUrl.searchParams.set(
    "state",
    "APPROVED"
  );

  const aclResponse =
    await fetch(
      aclUrl,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

  const aclData =
    await readLinkedInResponse(
      aclResponse
    );

  if (!aclResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          "LinkedIn a refusé la récupération des Pages administrées.",
        status:
          aclResponse.status,
        details:
          aclData,
      },
      {
        status:
          aclResponse.status,
      }
    );
  }

  const aclResult =
    aclData as
      | OrganizationAclResponse
      | null;

  const organizationUrns =
    Array.from(
      new Set(
        (
          aclResult?.elements ??
          []
        )
          .map(
            getOrganizationUrn
          )
          .filter(
            (
              urn
            ): urn is string =>
              Boolean(urn)
          )
      )
    );

  const organizations =
    await Promise.all(
      organizationUrns.map(
        async (organizationUrn) => {
          const organizationId =
            getOrganizationId(
              organizationUrn
            );

          if (!organizationId) {
            return {
              urn:
                organizationUrn,
              id: null,
              name: null,
              vanity_name: null,
              website: null,
              error:
                "URN LinkedIn invalide.",
            };
          }

          const organizationResponse =
            await fetch(
              `https://api.linkedin.com/rest/organizations/${organizationId}`,
              {
                method: "GET",
                headers,
                cache: "no-store",
              }
            );

          const organizationData =
            await readLinkedInResponse(
              organizationResponse
            );

          if (
            !organizationResponse.ok
          ) {
            return {
              urn:
                organizationUrn,
              id:
                organizationId,
              name: null,
              vanity_name: null,
              website: null,
              error:
                organizationData,
            };
          }

          const organization =
            organizationData as
              | LinkedInOrganization
              | null;

          if (!organization) {
            return {
              urn:
                organizationUrn,
              id:
                Number(
                  organizationId
                ),
              name: null,
              vanity_name: null,
              website: null,
              error:
                "LinkedIn n'a retourné aucune donnée pour cette organisation.",
            };
          }

          return {
            urn:
              organization.$URN ??
              organizationUrn,
            id:
              organization.id ??
              Number(
                organizationId
              ),
            name:
              organization.localizedName ??
              null,
            vanity_name:
              organization.vanityName ??
              null,
            website:
              organization.localizedWebsite ??
              null,
            error: null,
          };
        }
      )
    );

  const validOrganizations =
    organizations.filter(
      (organization) =>
        !organization.error &&
        organization.urn &&
        organization.name
    );

  let selectedOrganization:
    | {
        urn: string;
        name: string;
      }
    | null = null;

  if (
    validOrganizations.length === 1
  ) {
    const organization =
      validOrganizations[0];

    if (
      organization.urn &&
      organization.name
    ) {
      const {
        error: updateError,
      } = await supabaseAdmin
        .from(
          "linkedin_connection"
        )
        .update({
          organization_urn:
            organization.urn,
          organization_name:
            organization.name,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          connection.id
        );

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            message:
              "La Page LinkedIn a été trouvée mais Office n'a pas pu l'enregistrer.",
            error:
              updateError.message,
          },
          {
            status: 500,
          }
        );
      }

      selectedOrganization = {
        urn:
          organization.urn,
        name:
          organization.name,
      };
    }
  }

  return NextResponse.json({
    success: true,
    linkedin_version:
      LINKEDIN_VERSION,
    count:
      organizations.length,
    selected_organization:
      selectedOrganization,
    organizations,
  });
}
