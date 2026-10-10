import React, { useState } from 'react';
import { Activity, Sparkles, AlertTriangle, CheckCircle, User, Heart } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { predictionService } from '../lib/services/predictionService';
import type { DiabetesPredictionRequest, DiabetesPredictionResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const DiabetesPredictionPage: React.FC = () => {
  const { activeFamily, activeMember } = useFamily();
  const [formData, setFormData] = useState<DiabetesPredictionRequest>({
    age: 45,
    gender: 'Male',
    hypertension: false,
    heart_disease: false,
    smoking_history: 'never',
    bmi: 24.5,
    hba1c_level: 5.4,
    blood_glucose_level: 100.0,
    save_to_records: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPrefilling, setIsPrefilling] = useState<boolean>(false);
  const [result, setResult] = useState<DiabetesPredictionResponse | null>(null);

  const memberId = activeMember?.id || '';

  const handlePrefill = async () => {
    if (!memberId) {
      toast.error('Please pick an active family member');
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
        hypertension: prefill.hypertension ?? prev.hypertension,
        heart_disease: prefill.heart_disease ?? prev.heart_disease,
        smoking_history: prefill.smoking_history ?? prev.smoking_history,
        hba1c_level: prefill.hba1c_level ?? prev.hba1c_level,
        blood_glucose_level: prefill.blood_glucose_level ?? prev.blood_glucose_level,
      }));
      toast.success('Biometrics and vitals auto-prefilled from medical records!');
    } catch (err: any) {
      toast.error(err.message || 'No chronic records available for auto-prefill');
    } finally {
      setIsPrefilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const payload: DiabetesPredictionRequest = {
        ...formData,
        family_id: activeFamily?.id,
        family_member_id: memberId || undefined,
      };
      const res = await predictionService.predictDiabetes(payload);
      setResult(res);
      toast.success('Clinical inference computed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Inference engine failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactBadge = (direction: string) => {
    if (direction === 'HIGH_RISK_FACTOR') {
      return <Badge variant="red">High Risk Factor</Badge>;
    }
    if (direction === 'MODERATE_RISK_FACTOR') {
      return <Badge variant="amber">Moderate Risk</Badge>;
    }
    return <Badge variant="emerald">Protective Factor</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
            <Activity className="w-4 h-4" />
            <span>Two-Tier Stacking Super Learner (97.52% ROC-AUC)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Diabetes Risk Assessment
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ensemble machine learning analyzing metabolic biomarkers, HbA1c, and lifestyle vitals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/predictions/hypertension">
            <Button variant="outline" className="border-slate-200">
              <Heart className="w-4 h-4 mr-2" />
              Hypertension AI
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
                <span className="text-xs font-bold uppercase text-slate-600">Patient Biometrics</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrefill}
                disabled={isPrefilling}
                className="text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-500" />
                {isPrefilling ? 'Prefilling...' : 'Auto-Prefill'}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Age (Years)</label>
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
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
                  <span className="text-2xs text-slate-400">Normal: &lt; 5.7%</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Blood Glucose (mg/dL)</label>
                  <Input
                    type="number"
                    step="1"
                    min="30"
                    max="600"
                    value={formData.blood_glucose_level}
                    onChange={(e) => setFormData({ ...formData, blood_glucose_level: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <span className="text-2xs text-slate-400">Fasting: 70 - 99</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-teal-600 focus:ring-teal-500"
                    checked={formData.hypertension}
                    onChange={(e) => setFormData({ ...formData, hypertension: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-slate-700">Patient has diagnosed Hypertension</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-teal-600 focus:ring-teal-500"
                    checked={formData.heart_disease}
                    onChange={(e) => setFormData({ ...formData, heart_disease: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-slate-700">Patient has diagnosed Heart Disease</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    className="rounded text-teal-600 focus:ring-teal-500"
                    checked={formData.save_to_records}
                    onChange={(e) => setFormData({ ...formData, save_to_records: e.target.checked })}
                  />
                  <span className="text-xs text-slate-500">Save prediction to member's longitudinal history</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 shadow-sm mt-4"
              >
                {isLoading ? 'Computing Ensemble Model...' : 'Execute AI Risk Assessment'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {!result ? (
            <Card className="p-12 text-center bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-2xs">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Awaiting Assessment Parameters</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Fill the clinical biomarker parameters on the left or click "Auto-Prefill" from verified patient records to run the stacking model.
              </p>
            </Card>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {result.risk_percentage >= 75 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div className="text-xs text-rose-800">
                    <strong className="block font-bold">Automated Guardian Alert Triggered</strong>
                    Risk score exceeds 75%. An automated clinical priority alert has been broadcast to family guardians.
                  </div>
                </div>
              )}

              <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white border-0 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-teal-300">
                      Inference Result
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
                      Confidence Level: <strong className="text-teal-200">{result.confidence_level}</strong>
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
                      <span className="text-xs font-bold text-white block">Risk</span>
                      <span className="text-2xs text-slate-400">Probability</span>
                    </div>
                  </div>
                </div>
              </Card>

              {result.feature_impacts && result.feature_impacts.length > 0 && (
                <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Local Feature Attribution & Risk Drivers
                  </h3>

                  <div className="space-y-3">
                    {result.feature_impacts.map((feat, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{feat.feature_name}: {feat.feature_value}</span>
                          {getImpactBadge(feat.impact_direction)}
                        </div>
                        <p className="text-2xs text-slate-600 leading-relaxed">
                          {feat.clinical_explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <Card className="p-6 bg-white border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">Actionable Clinical Guidelines</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
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

export default DiabetesPredictionPage;
