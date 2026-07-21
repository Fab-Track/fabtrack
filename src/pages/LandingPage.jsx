import React, { useRef } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import AudienceStrip from "@/components/landing/AudienceStrip";
import FeatureGrid from "@/components/landing/FeatureGrid";
import WorkflowStrip from "@/components/landing/WorkflowStrip";
import RequestAccessSection from "@/components/landing/RequestAccessSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  const formRef = useRef(null);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav onRequestAccess={scrollToForm} />
      <LandingHero onRequestAccess={scrollToForm} />
      <AudienceStrip />
      <FeatureGrid />
      <WorkflowStrip />
      <RequestAccessSection ref={formRef} />
      <LandingFooter />
    </div>
  );
}