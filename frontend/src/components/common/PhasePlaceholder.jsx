import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PhasePlaceholder({ title, phase, description, features, returnPath, returnLabel }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-3xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              {phase}
            </span>
            <span className="text-xs text-slate-400">Roadmap Target</span>
          </div>
          <h2 className="text-xl font-bold text-[#102a43] mt-1.5">{title}</h2>
        </div>
        <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-100">
          <Construction className="w-6 h-6 text-sky-600" />
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        {description}
      </p>

      {features && features.length > 0 && (
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Features in this module:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link
          to={returnPath}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#102a43] text-white text-xs font-semibold rounded-xl hover:bg-[#1d3557] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{returnLabel}</span>
        </Link>
      </div>
    </div>
  );
}

