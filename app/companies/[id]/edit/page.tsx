import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import PageBanner from "@/components/dashboard/PageBanner";

import {
  getCompanyById,
  updateCompany,
  type PipelineStage,
  type RelationshipStatus,
} from "@/lib/companies";

export const dynamic = "force-dynamic";

type EditCompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  const { id } = await params;

  const company =
    await getCompanyById(id);

  if (!company) {
    notFound();
  }

  async function saveCompany(
    formData: FormData
  ) {
    "use server";

    const currentCompany =
      await getCompanyById(id);

    if (!currentCompany) {
      notFound();
    }

    const value = (
      name: string
    ) => {
      const raw =
        formData.get(name);

      if (
        typeof raw !== "string"
      ) {
        return null;
      }

      const cleaned =
        raw.trim();

      return cleaned || null;
    };

    const name =
      value("name");

    if (!name) {
      throw new Error(
        "Le nom de l’entreprise est obligatoire."
      );
    }

    await updateCompany(
      id,
      {
        name,

        legal_name:
          value(
            "legal_name"
          ),

        email:
          value("email"),

        phone:
          value("phone"),

        website:
          value("website"),

        address:
          value("address"),

        address_line_2:
          value(
            "address_line_2"
          ),

        postal_code:
          value(
            "postal_code"
          ),

        city:
          value("city"),

        state:
          value("state"),

        country:
          value("country"),

        customer_number:
          currentCompany.customer_number,

        siren:
          currentCompany.siren,

        siret:
          currentCompany.siret,

        vat_number:
          currentCompany.vat_number,

        legal_form:
          currentCompany.legal_form,

        ape_code:
          currentCompany.ape_code,

        ape_label:
          currentCompany.ape_label,

        creation_date:
          currentCompany.creation_date,

        employee_range:
          currentCompany.employee_range,

        legal_data_updated_at:
          currentCompany.legal_data_updated_at,

        notes:
          value("notes"),

        zoho_contact_id:
          currentCompany.zoho_contact_id,

        is_active:
          formData.get(
            "is_active"
          ) === "on",

        relationship_status:
          (
            value(
              "relationship_status"
            ) ??
            "prospect"
          ) as RelationshipStatus,

        pipeline_stage:
          (
            value(
              "pipeline_stage"
            ) ??
            "new"
          ) as PipelineStage,

        sector:
          currentCompany.sector,

        business_description:
          currentCompany.business_description,

        target_audience:
          currentCompany.target_audience,

        geographic_area:
          currentCompany.geographic_area,

        tone_of_voice:
          currentCompany.tone_of_voice,

        communication_style:
          currentCompany.communication_style,

        services:
          currentCompany.services,

        products:
          currentCompany.products,

        strengths:
          currentCompany.strengths,

        values:
          currentCompany.values,

        seo_keywords:
          currentCompany.seo_keywords,

        geo_keywords:
          currentCompany.geo_keywords,

        competitors:
          currentCompany.competitors,

        preferred_channels:
          currentCompany.preferred_channels,

        publication_frequency:
          currentCompany.publication_frequency,

        editorial_objectives:
          currentCompany.editorial_objectives,

        ai_instructions:
          currentCompany.ai_instructions,

        ai_do_not:
          currentCompany.ai_do_not,

        brand_story:
          currentCompany.brand_story,
      }
    );

    revalidatePath(
      `/companies/${id}`
    );

    revalidatePath(
      "/companies"
    );

    redirect(
      `/companies/${id}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageBanner
          eyebrow="CRM"
          title={`Modifier ${company.name}`}
          description="Coordonnées et informations générales de l’entreprise."
        />

        <div className="mt-6">
          <Link
            href={`/companies/${company.id}`}
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Retour à la fiche entreprise
          </Link>
        </div>

        <form
          action={saveCompany}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <SectionTitle>
            Informations générales
          </SectionTitle>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Field
              label="Nom de l’entreprise"
              name="name"
              defaultValue={
                company.name
              }
              required
            />

            <Field
              label="Raison sociale"
              name="legal_name"
              defaultValue={
                company.legal_name
              }
            />

            <Field
              label="Téléphone"
              name="phone"
              defaultValue={
                company.phone
              }
              type="tel"
            />

            <Field
              label="E-mail"
              name="email"
              defaultValue={
                company.email
              }
              type="email"
            />

            <Field
              label="Site internet"
              name="website"
              defaultValue={
                company.website
              }
              placeholder="https://..."
            />

            <Field
              label="N° client"
              name="customer_number_display"
              defaultValue={
                company.customer_number
              }
              disabled
            />
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <SectionTitle>
              Adresse
            </SectionTitle>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Field
                label="Adresse"
                name="address"
                defaultValue={
                  company.address
                }
              />

              <Field
                label="Complément d’adresse"
                name="address_line_2"
                defaultValue={
                  company.address_line_2
                }
              />

              <Field
                label="Code postal"
                name="postal_code"
                defaultValue={
                  company.postal_code
                }
              />

              <Field
                label="Ville"
                name="city"
                defaultValue={
                  company.city
                }
              />

              <Field
                label="Région / département"
                name="state"
                defaultValue={
                  company.state
                }
              />

              <Field
                label="Pays"
                name="country"
                defaultValue={
                  company.country
                }
              />
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <SectionTitle>
              Suivi commercial
            </SectionTitle>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <SelectField
                label="Relation"
                name="relationship_status"
                defaultValue={
                  company.relationship_status
                }
                options={[
                  {
                    value:
                      "prospect",
                    label:
                      "Prospect",
                  },
                  {
                    value:
                      "client",
                    label:
                      "Client",
                  },
                ]}
              />

              <SelectField
                label="Étape commerciale"
                name="pipeline_stage"
                defaultValue={
                  company.pipeline_stage
                }
                options={[
                  {
                    value: "new",
                    label: "Nouveau",
                  },
                  {
                    value:
                      "contact",
                    label:
                      "Contacté",
                  },
                  {
                    value:
                      "meeting",
                    label:
                      "Rendez-vous",
                  },
                  {
                    value:
                      "proposal",
                    label:
                      "Proposition",
                  },
                  {
                    value:
                      "negotiation",
                    label:
                      "Négociation",
                  },
                  {
                    value:
                      "client",
                    label:
                      "Client",
                  },
                  {
                    value:
                      "lost",
                    label:
                      "Perdu",
                  },
                ]}
              />
            </div>

            <label className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={
                  company.is_active
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Entreprise active
            </label>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <SectionTitle>
              Notes
            </SectionTitle>

            <textarea
              name="notes"
              defaultValue={
                company.notes ??
                ""
              }
              rows={6}
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Notes internes..."
            />
          </div>

          <div className="mt-10 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
            <Link
              href={`/companies/${company.id}`}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  defaultValue?:
    | string
    | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>

      <input
        type={type}
        name={name}
        defaultValue={
          defaultValue ??
          ""
        }
        placeholder={
          placeholder
        }
        required={
          required
        }
        disabled={
          disabled
        }
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{
    value: string;
    label: string;
  }>;
};

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>

      <select
        name={name}
        defaultValue={
          defaultValue
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          )
        )}
      </select>
    </label>
  );
}

function SectionTitle({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
      {children}
    </p>
  );
}