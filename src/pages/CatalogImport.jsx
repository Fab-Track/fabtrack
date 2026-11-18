import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { hasAnyRole } from "@/lib/roleHelpers";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import ImportUploadStep from "@/components/catalog/import/ImportUploadStep";
import ImportMappingStep from "@/components/catalog/import/ImportMappingStep";
import ImportResultsStep from "@/components/catalog/import/ImportResultsStep";
import ValueMappingDialog from "@/components/catalog/import/ValueMappingDialog";
import { loadAllCostItems } from "@/lib/costItemsCsv";
import {
  autoMap, collectUnmatched, mappedValues, normHeader, parseCsvText, unitLooksNumeric, applyCatalogImport,
} from "@/lib/catalogImport";

export default function CatalogImport() {
  const { user } = useAuth();
  const orgId = user?.organization_id;
  const canImport = hasAnyRole(user, ["owner", "admin"]);

  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [skipped, setSkipped] = useState(() => new Set());
  const [rowIndex, setRowIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [resolved, setResolved] = useState({});
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [valueGroups, setValueGroups] = useState({});
  const [valueOpen, setValueOpen] = useState(false);
  const [unitNumeric, setUnitNumeric] = useState(false);

  const { data: costCodes = [] } = useQuery({
    queryKey: ["costCodes", orgId],
    queryFn: async () => (await base44.entities.CostCode.filter(
      { organization_id: orgId, active: { $ne: false } }, { sort: "code_number", limit: 500 }
    )).items,
    enabled: !!orgId && canImport,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["costItems", "units", orgId],
    queryFn: async () => (await base44.entities.MaterialPriceList.filter(
      { organization_id: orgId }, { distinct: "unit" }
    )).items.filter(Boolean).sort(),
    enabled: !!orgId && canImport,
  });

  const storageKey = `catalogImportMapping:${orgId || "org"}`;

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  }

  useEffect(() => {
    if (!headers.length || !Object.keys(mapping).length) return;
    localStorage.setItem(storageKey, JSON.stringify(mapping));
  }, [mapping, headers.length, storageKey]);

  async function handleFile(file) {
    if (!/\.csv$/i.test(file?.name || "")) return toast.error("Choose a .csv file.");
    setReading(true);
    try {
      const { headers: heads, rows: data } = parseCsvText(await file.text());
      const saved = readSaved();
      const auto = autoMap(heads);
      const initial = {};
      heads.forEach((h) => {
        const key = normHeader(h);
        if (!key) return;
        initial[key] = saved[key] || auto[key] || "";
      });
      setFileName(file.name);
      setHeaders(heads);
      setRows(data);
      setMapping(initial);
      setSkipped(new Set());
      setRowIndex(0);
      setResults([]);
      setResolved({});
      setStep("map");
    } catch (e) {
      toast.error(e?.message || "That file could not be read.");
    } finally {
      setReading(false);
    }
  }

  function targetsFor(mode) {
    const done = new Set(results.map((r) => r.index));
    return rows.map((cells, index) => ({ index, cells }))
      .filter((r) => !skipped.has(r.index) && !done.has(r.index))
      .filter((r) => mode === "rest" || r.index === rowIndex);
  }

  async function runImport(targets, mode, resolvedMap = resolved) {
    setBusy(true);
    try {
      const existing = await loadAllCostItems(orgId);
      const added = await applyCatalogImport({
        rows: targets, headers, mapping, resolved: resolvedMap, orgId, existing, costCodes,
      });
      setResults((prev) => [...prev, ...added]);
      if (mode === "rest") {
        setStep("results");
      } else {
        const done = new Set([...results.map((r) => r.index), ...added.map((r) => r.index), ...skipped]);
        const next = rows.findIndex((_, i) => i > rowIndex && !done.has(i));
        if (next !== -1) setRowIndex(next);
      }
    } catch (e) {
      toast.error(e?.message || "The import could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestImport(mode) {
    const targets = targetsFor(mode);
    if (!targets.length) {
      return toast.error(mode === "one" ? "This row was already imported or skipped." : "There are no rows left to import.");
    }
    const groups = collectUnmatched(targets, headers, mapping, { costCodes, units });
    if (Object.values(groups).some((g) => g.length)) {
      setPending({ mode, targets });
      setValueGroups(groups);
      setUnitNumeric(unitLooksNumeric(targets, headers, mapping));
      setValueOpen(true);
      return;
    }
    await runImport(targets, mode);
  }

  function skipRow() {
    const nextSkipped = new Set(skipped).add(rowIndex);
    setSkipped(nextSkipped);
    const done = new Set([...results.map((r) => r.index), ...nextSkipped]);
    const next = rows.findIndex((_, i) => i > rowIndex && !done.has(i));
    if (next !== -1) setRowIndex(next);
  }

  const allResults = useMemo(() => {
    const list = [...results];
    const have = new Set(list.map((r) => r.index));
    [...skipped].forEach((i) => {
      if (have.has(i)) return;
      const name = mappedValues(rows[i] || [], headers, mapping).name || "—";
      list.push({ index: i, status: "skipped", name, message: "Skipped" });
    });
    return list.sort((a, b) => a.index - b.index);
  }, [results, skipped, rows, headers, mapping]);

  if (!canImport) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-3">
        <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Only owners and admins can import the catalog</h1>
        <Button asChild variant="outline"><Link to="/catalog">Back to Catalog</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5"><Link to="/catalog"><ArrowLeft className="w-4 h-4" /> Catalog</Link></Button>
        <h1 className="text-2xl font-bold">Import Catalog</h1>
      </div>

      {step === "upload" && <ImportUploadStep onFile={handleFile} reading={reading} />}

      {step === "map" && (
        <ImportMappingStep
          headers={headers} rows={rows} mapping={mapping}
          onChange={(key, field) => setMapping((m) => ({ ...m, [key]: field }))}
          rowIndex={rowIndex}
          onPrev={() => setRowIndex((i) => Math.max(0, i - 1))}
          onSkip={skipRow}
          onImportRow={() => requestImport("one")}
          onImportAll={() => requestImport("rest")}
          onViewResults={() => setStep("results")}
          resultCount={results.length}
          skipped={skipped}
          busy={busy}
        />
      )}

      {step === "results" && (
        <ImportResultsStep
          results={allResults} fileName={fileName} headers={headers} rows={rows}
          onRestart={() => { setStep("upload"); setResults([]); setRows([]); setHeaders([]); setSkipped(new Set()); }}
        />
      )}

      <ValueMappingDialog
        open={valueOpen} groups={valueGroups} costCodes={costCodes} units={units} unitNumeric={unitNumeric}
        onCancel={() => { setValueOpen(false); setPending(null); }}
        onContinue={(resolvedMap) => {
          setResolved(resolvedMap);
          setValueOpen(false);
          if (pending) runImport(pending.targets, pending.mode, resolvedMap);
          setPending(null);
        }}
      />
    </div>
  );
}