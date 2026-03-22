import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Yogat Fleet AI',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#94a3b8] to-[#f1f5f9] bg-clip-text text-transparent mb-8">
          Terms of Service
        </h1>
        <div className="prose prose-invert">
          <p>Last updated: March 2026</p>
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Yogat Fleet AI... [your content]</p>
          {/* Add more sections as needed */}
        </div>
      </div>
    </div>
  );
}

