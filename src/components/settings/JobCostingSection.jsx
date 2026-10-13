import React from "react";
import RatesDefaultsCard from "./jobcosting/RatesDefaultsCard";
import CostCodesCard from "./jobcosting/CostCodesCard";

export default function JobCostingSection() {
  return (
    <div className="space-y-6">
      <RatesDefaultsCard />
      <CostCodesCard />
    </div>
  );
}