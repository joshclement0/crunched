import * as React from "react";
import { CompanyDraft, EMPTY_COMPANY_DRAFT, TrackedCompany } from "./types";

export function useCompanyEditor(
  companies: TrackedCompany[],
  onChange: (companies: TrackedCompany[]) => void
) {
  const [draft, setDraft] = React.useState<CompanyDraft>(EMPTY_COMPANY_DRAFT);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const close = () => {
    setDraft(EMPTY_COMPANY_DRAFT);
    setEditingId(null);
    setIsOpen(false);
  };

  const openNew = () => {
    setDraft(EMPTY_COMPANY_DRAFT);
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (company: TrackedCompany) => {
    setDraft({
      name: company.name,
      sector: company.sector,
      relationship: company.relationship,
      website: company.website || "",
      notes: company.notes || "",
      investedAmount: company.investedAmount || "",
      nextReview: company.nextReview || "",
    });
    setEditingId(company.id);
    setIsOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    const existing = companies.find((company) => company.id === editingId);
    const savedCompany: TrackedCompany = {
      ...draft,
      id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: draft.name.trim(),
      sector: draft.sector || "Other",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    onChange(
      existing
        ? companies.map((company) => (company.id === existing.id ? savedCompany : company))
        : [savedCompany, ...companies]
    );
    close();
  };

  const remove = (id: string) => onChange(companies.filter((company) => company.id !== id));

  return { draft, setDraft, editingId, isOpen, openNew, openEdit, close, save, remove };
}
