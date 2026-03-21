import React, { useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { documents } from '../../data/brokerageMockData';

const documentTypes = ['All', 'Statement', 'Trade Confirmation', 'Funding Advice', 'Tax Document'];

const DocumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [documentType, setDocumentType] = useState('All');

  const filteredDocuments = useMemo(() => {
    return documents.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.period.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = documentType === 'All' || item.type === documentType;
      return matchesSearch && matchesType;
    });
  }, [searchTerm, documentType]);

  return (
    <DashboardLayout title="Documents" subtitle="Statements, trade confirmations, tax files, and funding notices">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search documents"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {documentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocumentType(type)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${documentType === type ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Available files</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredDocuments.length} document(s) available</p>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredDocuments.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <FileText className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.period}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Generated {item.generatedAt}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.status}
                  </span>
                  <Button variant="outline" disabled={item.status !== 'Ready'}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DocumentsPage;