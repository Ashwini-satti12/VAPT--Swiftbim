/**
 * Client advance payment gate — mirrors backend `requires_advance_payment` /
 * `advance_payment_verified` on project payloads.
 */

export type AdvanceGateProject = {
  id: number;
  project_name?: string;
  main_project_id?: number | null;
  requires_advance_payment?: boolean;
  advance_payment_verified?: boolean;
  swiftbim_contract_internal_id?: number | null;
  swiftbim_proposal_id?: number | null;
};

export function isClientAdvanceBlockingProject(
  p: AdvanceGateProject | null | undefined,
): boolean {
  return Boolean(p?.requires_advance_payment && !p?.advance_payment_verified);
}

/** Commercial Payment Milestones (TD route); shared by PM/BL/BC/BM. */
export function buildAdvancePaymentMilestonesHref(
  project: AdvanceGateProject,
): string {
  const mainId = project.main_project_id;
  const pid =
    mainId != null &&
    typeof mainId === "number" &&
    Number.isFinite(mainId) &&
    mainId > 0
      ? mainId
      : project.id;
  const qs = new URLSearchParams();
  qs.set("project_id", String(pid));
  const cid = project.swiftbim_contract_internal_id;
  if (cid != null && Number(cid) > 0) {
    qs.set("contract_id", String(cid));
  }
  const prop = project.swiftbim_proposal_id;
  if (prop != null && Number(prop) > 0) {
    qs.set("proposal_id", String(prop));
  }
  const name = (project.project_name || "").trim();
  if (name) qs.set("project_name", name);
  return `/td/payment-milestones?${qs.toString()}`;
}

export const INTERNAL_ADVANCE_BLOCK_MESSAGE =
  "You cannot start full project work or open project details until the client has paid the required advance, with commercial approval on payments.";
