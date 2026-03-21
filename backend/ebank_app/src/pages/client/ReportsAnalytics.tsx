import React from 'react';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { researchThemes } from '../../data/brokerageMockData';

const ResearchPage: React.FC = () => {
  return (
    <DashboardLayout title="Research" subtitle="Strategy themes, macro context, and portfolio-level decision support">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <BarChart3 className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Macro</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Central bank expectations and rate volatility are still the main cross-asset driver in this build.</p>
          </Card>
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <TrendingUp className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Momentum</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Equity growth and crypto beta remain supportive, but the UI should surface regime-change warnings next.</p>
          </Card>
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <FileText className="h-5 w-5 text-blue-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Reporting</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Phase 1 research stays qualitative. Quant dashboards can follow once live positions and quotes are connected.</p>
          </Card>
        </section>

        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Current themes</h2>
            <p className="mt-1 text-sm text-slate-500">Reusable research cards for the brokerage client experience</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {researchThemes.map((theme) => (
              <div key={theme.title} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">{theme.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{theme.focus}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{theme.description}</p>
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Portfolio impact:</span> {theme.impact}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ResearchPage;