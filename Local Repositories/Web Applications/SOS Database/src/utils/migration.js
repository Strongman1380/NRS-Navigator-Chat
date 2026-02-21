/**
 * One-time data migration for existing clients and entries.
 * - Clients: move root-level auth/service dates into services.CTA map
 * - Entries: set serviceType: "CTA", rename signatureOfCTA → providerSignature, time → timeStart
 * - Sets _schemaVersion: 2 on migrated docs
 * Non-destructive: old fields are preserved.
 */

export async function migrateData(db) {
  if (!db) return;

  const COLLECTIONS = { CLIENTS: "clients", ENTRIES: "entries" };

  // ─── Migrate Clients ─────────────────────────────────────────────────
  try {
    const clientSnap = await db
      .collection(COLLECTIONS.CLIENTS)
      .where("_schemaVersion", "!=", 2)
      .get()
      .catch(() => null);

    // Fallback: if _schemaVersion field doesn't exist yet, get all and filter
    const allClients = clientSnap && !clientSnap.empty
      ? clientSnap.docs
      : (await db.collection(COLLECTIONS.CLIENTS).get()).docs.filter(
          (d) => d.data()._schemaVersion !== 2
        );

    for (const doc of allClients) {
      const data = doc.data();
      if (data._schemaVersion === 2) continue;

      const update = { _schemaVersion: 2 };

      // Move root-level service/auth fields into services.CTA if no services map exists
      if (!data.services || Object.keys(data.services).length === 0) {
        const hasLegacyFields =
          data.serviceStartDate ||
          data.serviceEndDate ||
          data.authStartDate ||
          data.authEndDate;

        if (hasLegacyFields) {
          update.services = {
            CTA: {
              active: true,
              serviceStartDate: data.serviceStartDate || "",
              serviceEndDate: data.serviceEndDate || "",
              authStartDate: data.authStartDate || "",
              authEndDate: data.authEndDate || "",
              authReferenceNumber: "",
              approvedCptHcpcs: "",
              approvedModifiers: "",
              primaryIcd10Code: "",
              totalUnitsApproved: "",
              unitsUsed: 0,
              frequencyLimits: "",
              initialAssessmentDate: "",
              lastTreatmentPlanReview: "",
              dischargePlanDate: "",
            },
          };
        }
      }

      await doc.ref.update(update);
    }

    console.log(`Migrated ${allClients.length} client(s) to schema v2`);
  } catch (err) {
    console.error("Client migration error:", err);
  }

  // ─── Migrate Entries ──────────────────────────────────────────────────
  try {
    const allEntries = (await db.collection(COLLECTIONS.ENTRIES).get()).docs.filter(
      (d) => d.data()._schemaVersion !== 2
    );

    for (const doc of allEntries) {
      const data = doc.data();
      if (data._schemaVersion === 2) continue;

      const update = { _schemaVersion: 2 };

      // Set serviceType to CTA if missing
      if (!data.serviceType) {
        update.serviceType = "CTA";
      }

      // Rename signatureOfCTA → providerSignature
      if (data.signatureOfCTA && !data.providerSignature) {
        update.providerSignature = data.signatureOfCTA;
      }

      // Rename time → timeStart
      if (data.time && !data.timeStart) {
        update.timeStart = data.time;
      }

      await doc.ref.update(update);
    }

    console.log(`Migrated ${allEntries.length} entry(ies) to schema v2`);
  } catch (err) {
    console.error("Entry migration error:", err);
  }
}
