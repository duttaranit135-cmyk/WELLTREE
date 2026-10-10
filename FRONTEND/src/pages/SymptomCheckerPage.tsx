import React, { useState, useEffect } from 'react';
import { Sparkles, Search, X, CheckCircle, Activity, Info, AlertOctagon } from 'lucide-react';
import { predictionService } from '../lib/services/predictionService';
import type { SymptomCheckerRequest, SymptomCheckerResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const CRITICAL_SYMPTOMS = [
  'breathlessness', 'chest_pain', 'coma', 'altered_sensorium', 
  'irregular_sugar_level', 'loss_of_balance', 'spinning_movements'
];

export const SymptomCheckerPage: React.FC = () => {
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [topK, setTopK] = useState<number>(3);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<SymptomCheckerResponse | null>(null);

  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const data = await predictionService.getSymptoms();
        setAllSymptoms(data.symptoms || []);
      } catch (err: any) {
        console.warn('Failed to fetch clinical symptoms:', err);
        toast.error('Failed to load symptom dictionary');
      }
    };
    fetchSymptoms();
  }, []);

  const filteredSuggestions = allSymptoms
    .filter((s) => !selectedSymptoms.includes(s) && s.toLowerCase().replace(/_/g, ' ').includes(searchQuery.toLowerCase()))
    .slice(0, 15);

  const addSymptom = (s: string) => {
    if (!selectedSymptoms.includes(s)) {
      setSelectedSymptoms([...selectedSymptoms, s]);
      setSearchQuery('');
    }
  };

  const removeSymptom = (s: string) => {
    setSelectedSymptoms(selectedSymptoms.filter((item) => item !== s));
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSymptoms.length === 0) {
      toast.error('Please select at least 1 symptom');
      return;
    }

    try {
      setIsEvaluating(true);
      const payload: SymptomCheckerRequest = {
        symptoms: selectedSymptoms,
        top_k: topK,
      };
      const res = await predictionService.checkSymptoms(payload);
      setResult(res);
      toast.success('Differential diagnosis computed');
    } catch (err: any) {
      toast.error(err.message || 'Diagnostic inference failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const hasCriticalSymptoms = selectedSymptoms.some((s) => CRITICAL_SYMPTOMS.includes(s));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Disease Diagnostic Checker (41 Diseases & 131 Symptoms)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Symptom Diagnostic Checker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Multiclass Random Forest classifier matching clinical symptom complexes to evidence-based differential candidates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/predictions/diabetes">
            <Button variant="outline" className="border-slate-200">
              <Activity className="w-4 h-4 mr-2" />
              Diabetes
            </Button>
          </Link>
          <Link to="/predictions/hypertension">
            <Button variant="outline" className="border-slate-200">
              <Activity className="w-4 h-4 mr-2" />
              Hypertension
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-900 leading-relaxed">
          <strong>Clinical Triage Notice:</strong> This AI tool provides informational differential triage and statistical likelihood. It does not constitute an official medical diagnosis by a licensed physician. If you are experiencing acute distress, call emergency services immediately.
        </p>
      </div>

      {hasCriticalSymptoms && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3 animate-fade-in">
          <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs text-rose-900">
            <strong className="block font-bold">Acute Warning: Potentially High-Risk Symptoms Selected</strong>
            You have selected symptoms (such as chest pain or breathlessness) that can signify acute cardiopulmonary emergencies. Seek emergency evaluation if accompanied by sweating, radiating pain, or severe weakness.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-slate-900">Select Experienced Symptoms</h2>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search symptoms (e.g. chills, headache, cough)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              />

              {searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                  {filteredSuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No matching symptoms found</div>
                  ) : (
                    filteredSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSymptom(s)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-medium capitalize"
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Selected Symptoms ({selectedSymptoms.length})</span>
                {selectedSymptoms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSymptoms([])}
                    className="text-rose-600 hover:underline font-normal"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedSymptoms.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-400">
                  Type in the box above to add symptoms.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                  {selectedSymptoms.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold capitalize"
                    >
                      {s.replace(/_/g, ' ')}
                      <button
                        type="button"
                        onClick={() => removeSymptom(s)}
                        className="text-teal-600 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-400">
                Common Symptoms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['chills', 'high_fever', 'headache', 'cough', 'fatigue', 'nausea', 'vomiting', 'chest_pain'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => addSymptom(sym)}
                    disabled={selectedSymptoms.includes(sym)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-colors ${
                      selectedSymptoms.includes(sym)
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-slate-100 text-slate-700 hover:bg-teal-100/60 hover:text-teal-800'
                    }`}
                  >
                    + {sym.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Top Candidate Matches (top_k)</span>
                <span className="text-teal-700">{topK} diseases</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 3)}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            <Button
              onClick={handleEvaluate}
              disabled={isEvaluating || selectedSymptoms.length === 0}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 shadow-sm"
            >
              {isEvaluating ? 'Evaluating Multiclass Model...' : 'Run Symptom Diagnostic'}
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <Card className="p-12 text-center bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-2xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Assessment Run Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select your symptoms on the left to evaluate clinical disease candidates, medical descriptions, and structured precautions.
              </p>
            </Card>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white border-0 shadow-lg space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-teal-300">
                      Top Disease Candidate
                    </span>
                    <h2 className="text-3xl font-black text-white">{result.top_disease}</h2>
                  </div>
                  <Badge variant="teal" className="text-sm font-bold px-3 py-1">
                    {result.confidence_percent.toFixed(1)}% Confidence
                  </Badge>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                  {result.top_predictions[0]?.description || 'Clinical profile matched from diagnostic model.'}
                </div>
              </Card>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-base">Top Differential Diagnoses</h3>
                <div className="space-y-4">
                  {result.top_predictions.map((item, idx) => (
                    <Card
                      key={idx}
                      className="p-5 bg-white border border-slate-200/90 shadow-xs space-y-4 hover:border-teal-200 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                            #{idx + 1}
                          </span>
                          <h4 className="font-bold text-slate-900 text-base">{item.disease}</h4>
                        </div>
                        <Badge variant="gray" className="text-xs font-bold">
                          {item.confidence_percent.toFixed(1)}% Match
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {item.description}
                      </p>

                      {item.precautions && item.precautions.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-2xs font-bold uppercase text-slate-500 block">
                            Recommended Clinical Precautions
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.precautions.map((prec, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-start gap-2 p-2 rounded-lg bg-teal-50/40 border border-teal-100/80 text-xs text-slate-800"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                                <span>{prec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SymptomCheckerPage;
