import React, { useState } from 'react';
import { Heart, Sparkles, AlertTriangle, CheckCircle, Activity, User } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { predictionService } from '../lib/services/predictionService';
import type { HypertensionPredictionRequest, HypertensionPredictionResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const HypertensionPredictionPage: React.FC = () => {
  const { activeFamily, activeMember } = useFamily();
  const [formData, setFormData] = useState<HypertensionPredictionRequest>({
    age: 50,
    gender: 'Male',
    heart_disease: false,
    smoking_history: 'never',
    bmi: 26.0,
    hba1c_level: 5.6,
    blood_glucose_level: 110.0,
    diabetes: false,
    save_to_records: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPrefilling, setIsPrefilling] = useState<boolean>(false);
  const [result, setResult] = useState<HypertensionPredictionResponse | null>(null);

  const memberId = activeMember?.id || '';

  const handlePrefill = async () => {
    if (!memberId) {
      toast.error('Select an active family member first');
      return;
    }
    try {
      setIsPrefilling(true);
      const prefill = await predictionService.getPrefill(memberId);
      setFormData((prev) => ({
        ...prev,
        age: prefill.age ?? prev.age,
        gender: prefill.gender ?? prev.gender,
        bmi: prefill.bmi ?? prev.bmi,
        heart_disease: prefill.heart_disease ?? prev.heart_disease,
        diabetes: prefill.diabetes ?? prev.diabetes,
        smoking_history: prefill.smoking_history ?? prev.smoking_history,
        hba1c_level: prefill.hba1c_level ?? prev.hba1c_level,
        blood_glucose_level: prefill.blood_glucose_level ?? prev.blood_glucose_level,
      }));
      toast.success('Biometrics and vitals auto-prefilled!');
    } catch (err: any) {
      toast.error(err.message || 'No records available for prefill');
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload: HypertensionPredictionRequest = {
        ...formData,
        family_id: activeFamily?.id,
        family_member_id: memberId || undefined,
      };
      const res = await predictionService.predictHypertension(payload);
      setResult(res);
      toast.success('Hypertension risk assessment evaluated');
    } catch (err: any) {
      toast.error(err.message || 'Evaluation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
            <Heart className="w-4 h-4" />
            <span>Soft-Voting Blended Ensemble (13 Physiological Factors)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Hypertension Risk Assessment
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Assess arterial blood pressure risk using metabolic profiles, cardiac factors, and lifestyle indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/predictions/diabetes">
            <Button variant="outline" className="border-slate-200">
              <Activity className="w-4 h-4 mr-2" />
              Diabetes AI
            </Button>
          </Link>
          <Link to="/predictions/symptom-checker">
            <Button variant="outline" className="border-teal-200 text-teal-700 bg-teal-50/50">
              <Sparkles className="w-4 h-4 mr-2" />
              Symptom Checker
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold uppercase text-slate-600">Patient Factors</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrefill}
                disabled={isPrefilling}
                className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-rose-500" />
                {isPrefilling ? 'Prefilling...' : 'Auto-Prefill'}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age</label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Gender</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">BMI (kg/m²)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="10"
                    max="80"
                    value={formData.bmi}
                    onChange={(e) => setFormData({ ...formData, bmi: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Smoking History</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-rose-500"
                    value={formData.smoking_history}
                    onChange={(e) => setFormData({ ...formData, smoking_history: e.target.value })}
                  >
                    <option value="never">Never</option>
                    <option value="former">Former</option>
                    <option value="current">Current</option>
                    <option value="ever">Ever</option>
                    <option value="not current">Not Current</option>
                    <option value="No Info">No Info</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">HbA1c Level (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="3.0"
                    max="20.0"
                    value={formData.hba1c_level}
                    onChange={(e) => setFormData({ ...formData, hba1c_level: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Glucose</label>
                  <Input
                    type="number"
                    step="1"
                    min="30"
                    max="600"
                    value={formData.blood_glucose_level}
                    onChange={(e) => setFormData({ ...formData, blood_glucose_level: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-rose-600 focus:ring-rose-500"
                    checked={formData.heart_disease}
                    onChange={(e) => setFormData({ ...formData, heart_disease: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-slate-700">Patient has diagnosed Heart Disease</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-rose-600 focus:ring-rose-500"
                    checked={formData.diabetes}
                    onChange={(e) => setFormData({ ...formData, diabetes: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-slate-700">Patient has diagnosed Diabetes</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 shadow-sm mt-4"
              >
                {isLoading ? 'Running Ensemble Inference...' : 'Evaluate Hypertension Risk'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <Card className="p-12 text-center bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-2xs">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Awaiting Assessment Parameters</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Configure patient vitals or auto-prefill to evaluate cardiovascular pressure risk.
              </p>
            </Card>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {result.risk_percentage >= 70 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div className="text-xs text-rose-800">
                    <strong className="block font-bold">High Hypertension Probability</strong>
                    Risk score exceeds 70%. Family guardians have been alerted to follow up on blood pressure monitoring.
                  </div>
                </div>
              )}

              <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950 text-white border-0 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-rose-300">
                      Hypertension Probability
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-black text-white">{result.risk_percentage.toFixed(1)}%</span>
                      <Badge
                        variant={result.risk_label === 'High Risk' ? 'red' : 'emerald'}
                        className="text-xs uppercase font-extrabold px-3 py-1"
                      >
                        {result.risk_label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300">
                      Confidence Level: <strong className="text-rose-200">{result.confidence_level}</strong>
                    </p>
                  </div>

                  <div className="relative w-28 h-28 flex items-center justify-center self-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="#334155" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke={result.risk_percentage >= 50 ? '#F43F5E' : '#10B981'}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - result.risk_percentage / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-xs font-bold text-white block">BP</span>
                      <span className="text-2xs text-slate-400">Risk</span>
                    </div>
                  </div>
                </div>
              </Card>

              {result.recommendations && result.recommendations.length > 0 && (
                <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">Clinical & Lifestyle Actions</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HypertensionPredictionPage;
