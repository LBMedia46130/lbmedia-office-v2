import type {
  Company,
} from "@/lib/companies";

import CompanyCard from "./CompanyCard";

type Props = {
  companies: Company[];
};

export default function CompanyGrid({
  companies,
}: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {companies.map(
        (company) => (
          <CompanyCard
            key={company.id}
            company={company}
          />
        )
      )}
    </div>
  );
}